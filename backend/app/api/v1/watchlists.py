from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.v1.deps import CurrentUserId, DbSession, TenantId
from app.models import Company, Watchlist
from app.schemas.watchlist import WatchlistAdd, WatchlistOut

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


@router.get("", response_model=list[WatchlistOut])
async def list_watchlist(db: DbSession, tenant_id: TenantId):
    result = await db.execute(
        select(Watchlist, Company.name, Company.composite_risk_score)
        .join(Company, Watchlist.company_id == Company.id)
        .where(Watchlist.tenant_id == tenant_id)
        .order_by(Company.composite_risk_score.desc())
    )
    rows = result.all()
    return [
        WatchlistOut(
            id=row[0].id,
            company_id=row[0].company_id,
            notes=row[0].notes,
            created_at=row[0].created_at,
            company_name=row[1],
            composite_risk_score=row[2],
        )
        for row in rows
    ]


@router.post("", response_model=WatchlistOut, status_code=201)
async def add_to_watchlist(
    body: WatchlistAdd, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId
):
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
        created_at=item.created_at,
        company_name=company.name,
        composite_risk_score=company.composite_risk_score,
    )


@router.delete("/{watchlist_id}", status_code=204)
async def remove_from_watchlist(watchlist_id: UUID, db: DbSession, tenant_id: TenantId):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await db.delete(item)
