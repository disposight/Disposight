from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select, text

from app.api.v1.deps import DbSession
from app.models import Company, Signal
from app.rate_limit import limiter
from app.schemas.company import CompanyListResponse, CompanyOut
from app.schemas.signal import SignalOut

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=CompanyListResponse)
@limiter.limit("60/minute")
async def list_companies(
    request: Request,
    db: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    state: str | None = None,
    min_risk: int | None = None,
    sort_by: str = "composite_risk_score",
):
    query = select(Company)
    count_query = select(func.count(Company.id))

    if search:
        query = query.where(
            Company.name.ilike(f"%{search}%") | Company.ticker.ilike(f"%{search}%")
        )
        count_query = count_query.where(
            Company.name.ilike(f"%{search}%") | Company.ticker.ilike(f"%{search}%")
        )

    if state:
        query = query.where(Company.headquarters_state == state.upper())
        count_query = count_query.where(Company.headquarters_state == state.upper())

    if min_risk is not None:
        query = query.where(Company.composite_risk_score >= min_risk)
        count_query = count_query.where(Company.composite_risk_score >= min_risk)

    total = (await db.execute(count_query)).scalar() or 0

    if sort_by == "name":
        query = query.order_by(Company.name)
    elif sort_by == "signal_count":
        query = query.order_by(Company.signal_count.desc())
    else:
        query = query.order_by(Company.composite_risk_score.desc())

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    companies = result.scalars().all()

    return CompanyListResponse(
        companies=[CompanyOut.model_validate(c) for c in companies],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{company_id}", response_model=CompanyOut)
@limiter.limit("60/minute")
async def get_company(request: Request, company_id: UUID, db: DbSession):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyOut.model_validate(company)


@router.get("/{company_id}/signals", response_model=list[SignalOut])
@limiter.limit("60/minute")
async def get_company_signals(
    request: Request,
    company_id: UUID,
    db: DbSession,
    limit: int = Query(50, ge=1, le=100),
):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(Signal)
        .where(Signal.company_id == company_id)
        .order_by(Signal.created_at.desc())
        .limit(limit)
    )
    signals = result.scalars().all()
    return [
        SignalOut(
            **{k: v for k, v in s.__dict__.items() if not k.startswith("_")},
            company_name=company.name,
        )
        for s in signals
    ]
