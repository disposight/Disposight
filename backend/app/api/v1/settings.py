from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import update

from app.api.v1.deps import DbSession, TenantId
from app.models import Tenant
from app.rate_limit import limiter

router = APIRouter(prefix="/settings", tags=["settings"])


class RevenueSettingsOut(BaseModel):
    price_per_device: float = 45.0


class RevenueSettingsUpdate(BaseModel):
    price_per_device: float = Field(gt=0, le=10000)


@router.get("/revenue", response_model=RevenueSettingsOut)
@limiter.limit("20/minute")
async def get_revenue_settings(request: Request, db: DbSession, tenant_id: TenantId):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        return RevenueSettingsOut()
    price = (tenant.settings or {}).get("price_per_device", 45.0)
    return RevenueSettingsOut(price_per_device=price)


@router.put("/revenue", response_model=RevenueSettingsOut)
@limiter.limit("20/minute")
async def update_revenue_settings(
    request: Request, body: RevenueSettingsUpdate, db: DbSession, tenant_id: TenantId
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        return RevenueSettingsOut(price_per_device=body.price_per_device)

    new_settings = dict(tenant.settings or {})
    new_settings["price_per_device"] = body.price_per_device

    await db.execute(
        update(Tenant).where(Tenant.id == tenant_id).values(settings=new_settings)
    )
    await db.flush()

    return RevenueSettingsOut(price_per_device=body.price_per_device)
