from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm.attributes import flag_modified

from app.api.v1.deps import DbSession
from app.models import Company, RawSignal, Signal
from app.processing.signal_analyzer import generate_signal_analysis
from app.rate_limit import limiter
from app.schemas.signal import SignalAnalysisOut, SignalListResponse, SignalOut

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("", response_model=SignalListResponse)
@limiter.limit("60/minute")
async def list_signals(
    request: Request,
    db: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    signal_type: str | None = None,
    signal_category: str | None = None,
    state: str | None = None,
    min_confidence: int | None = None,
    min_severity: int | None = None,
    company_id: UUID | None = None,
    sort_by: str = "created_at",
):
    query = select(Signal, Company.name.label("company_name")).join(
        Company, Signal.company_id == Company.id
    )
    count_query = select(func.count(Signal.id))

    if signal_type:
        query = query.where(Signal.signal_type == signal_type)
        count_query = count_query.where(Signal.signal_type == signal_type)
    if signal_category:
        query = query.where(Signal.signal_category == signal_category)
        count_query = count_query.where(Signal.signal_category == signal_category)
    if state:
        query = query.where(Signal.location_state == state.upper())
        count_query = count_query.where(Signal.location_state == state.upper())
    if min_confidence is not None:
        query = query.where(Signal.confidence_score >= min_confidence)
        count_query = count_query.where(Signal.confidence_score >= min_confidence)
    if min_severity is not None:
        query = query.where(Signal.severity_score >= min_severity)
        count_query = count_query.where(Signal.severity_score >= min_severity)
    if company_id:
        query = query.where(Signal.company_id == company_id)
        count_query = count_query.where(Signal.company_id == company_id)

    total = (await db.execute(count_query)).scalar() or 0

    if sort_by == "confidence":
        query = query.order_by(Signal.confidence_score.desc())
    elif sort_by == "severity":
        query = query.order_by(Signal.severity_score.desc())
    else:
        query = query.order_by(Signal.created_at.desc())

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    signals = []
    for row in rows:
        signal = row[0]
        company_name = row[1]
        out = SignalOut.model_validate(signal)
        out.company_name = company_name
        signals.append(out)

    return SignalListResponse(signals=signals, total=total, page=page, per_page=per_page)


@router.get("/{signal_id}", response_model=SignalOut)
@limiter.limit("60/minute")
async def get_signal(request: Request, signal_id: UUID, db: DbSession):
    result = await db.execute(
        select(Signal, Company.name.label("company_name"))
        .join(Company, Signal.company_id == Company.id)
        .where(Signal.id == signal_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")

    out = SignalOut.model_validate(row[0])
    out.company_name = row[1]
    return out


@router.get("/{signal_id}/analysis", response_model=SignalAnalysisOut)
@limiter.limit("20/minute")
async def get_signal_analysis(
    request: Request,
    signal_id: UUID,
    db: DbSession,
    force_refresh: bool = Query(False),
):
    # Load signal
    signal = await db.get(Signal, signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    # Load company
    company = await db.get(Company, signal.company_id) if signal.company_id else None

    # Load raw text
    raw_text = None
    if signal.raw_signal_id:
        raw_signal = await db.get(RawSignal, signal.raw_signal_id)
        if raw_signal:
            raw_text = raw_signal.raw_text

    # Load correlated signals
    correlated = []
    if signal.correlation_group_id:
        result = await db.execute(
            select(Signal)
            .where(Signal.correlation_group_id == signal.correlation_group_id)
            .where(Signal.id != signal.id)
            .limit(10)
        )
        correlated = result.scalars().all()

    # Generate analysis (may use cache)
    analysis = await generate_signal_analysis(
        signal=signal,
        company=company,
        raw_text=raw_text,
        correlated_signals=correlated,
        force_refresh=force_refresh,
    )

    # Persist cache update
    if not analysis.get("cached"):
        flag_modified(signal, "metadata_")
        await db.commit()

    # Build sources list: primary signal + correlated signals
    sources = [
        {"name": signal.source_name, "url": signal.source_url, "signal_type": signal.signal_type, "title": signal.title}
    ]
    for cs in correlated:
        sources.append({"name": cs.source_name, "url": cs.source_url, "signal_type": cs.signal_type, "title": cs.title})
    analysis["sources"] = sources

    return SignalAnalysisOut(**analysis)
