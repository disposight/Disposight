from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select

from app.api.v1.deps import CurrentUserId, DbSession, TenantId, TenantPlan
from app.models import Company, Watchlist
from app.plan_limits import raise_plan_limit
from app.rate_limit import limiter
from app.schemas.watchlist import WatchlistAdd, WatchlistOut, WatchlistStatusUpdate

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


def _build_watchlist_out(row) -> WatchlistOut:
    item = row[0]
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status or "watching",
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        company_name=row[1],
        composite_risk_score=row[2],
    )


@router.get("", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def list_watchlist(request: Request, db: DbSession, tenant_id: TenantId):
    result = await db.execute(
        select(Watchlist, Company.name, Company.composite_risk_score)
        .join(Company, Watchlist.company_id == Company.id)
        .where(Watchlist.tenant_id == tenant_id)
        .order_by(Company.composite_risk_score.desc())
    )
    return [_build_watchlist_out(row) for row in result.all()]


@router.post("", response_model=WatchlistOut, status_code=201)
@limiter.limit("20/minute")
async def add_to_watchlist(
    request: Request, body: WatchlistAdd, db: DbSession, tp: TenantPlan, user_id: CurrentUserId
):
    tenant_id = tp.tenant_id

    company = await db.get(Company, body.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.tenant_id == tenant_id, Watchlist.company_id == body.company_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already in watchlist")

    # Enforce watchlist cap
    count_result = await db.execute(
        select(func.count(Watchlist.id)).where(Watchlist.tenant_id == tenant_id)
    )
    current_count = count_result.scalar() or 0
    if current_count >= tp.limits.max_watchlist_companies:
        raise_plan_limit(
            "watchlist_companies",
            tp.plan,
            f"Watchlist limit reached ({current_count}/{tp.limits.max_watchlist_companies}). Upgrade for more.",
        )

    item = Watchlist(
        tenant_id=tenant_id,
        company_id=body.company_id,
        added_by=user_id,
        notes=body.notes,
    )
    db.add(item)
    await db.flush()

    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status or "watching",
        created_at=item.created_at,
        company_name=company.name,
        composite_risk_score=company.composite_risk_score,
    )


@router.delete("/{watchlist_id}", status_code=204)
@limiter.limit("20/minute")
async def remove_from_watchlist(request: Request, watchlist_id: UUID, db: DbSession, tenant_id: TenantId):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await db.delete(item)


@router.put("/{watchlist_id}/claim", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def claim_lead(
    request: Request, watchlist_id: UUID, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    item.status = "claimed"
    item.claimed_by = user_id
    item.claimed_at = datetime.now(timezone.utc)
    await db.flush()

    company = await db.get(Company, item.company_id)
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
    )


@router.put("/{watchlist_id}/status", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def update_lead_status(
    request: Request,
    watchlist_id: UUID,
    body: WatchlistStatusUpdate,
    db: DbSession,
    tenant_id: TenantId,
    user_id: CurrentUserId,
):
    valid_statuses = {"watching", "claimed", "contacted", "passed"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")

    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    item.status = body.status
    if body.status == "claimed" and not item.claimed_by:
        item.claimed_by = user_id
        item.claimed_at = datetime.now(timezone.utc)
    await db.flush()

    company = await db.get(Company, item.company_id)
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
    )


@router.get("/my-pipeline", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def my_pipeline(request: Request, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId):
    result = await db.execute(
        select(Watchlist, Company.name, Company.composite_risk_score)
        .join(Company, Watchlist.company_id == Company.id)
        .where(Watchlist.tenant_id == tenant_id)
        .where(
            (Watchlist.claimed_by == user_id) | (Watchlist.added_by == user_id)
        )
        .order_by(Company.composite_risk_score.desc())
    )
    return [_build_watchlist_out(row) for row in result.all()]


@router.get("/team-pipeline", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def team_pipeline(request: Request, db: DbSession, tp: TenantPlan):
    if not tp.limits.team_pipeline:
        raise_plan_limit("team_pipeline", tp.plan, "Team Pipeline requires the Professional plan.")
    tenant_id = tp.tenant_id
    result = await db.execute(
        select(Watchlist, Company.name, Company.composite_risk_score)
        .join(Company, Watchlist.company_id == Company.id)
        .where(Watchlist.tenant_id == tenant_id)
        .where(Watchlist.status != "watching")
        .order_by(Company.composite_risk_score.desc())
    )
    return [_build_watchlist_out(row) for row in result.all()]
