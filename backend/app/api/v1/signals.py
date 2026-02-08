from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.api.v1.deps import DbSession
from app.models import Company, Signal
from app.schemas.signal import SignalListResponse, SignalOut

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("", response_model=SignalListResponse)
async def list_signals(
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
async def get_signal(signal_id: UUID, db: DbSession):
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
