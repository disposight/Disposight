from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.api.v1.deps import CurrentUserId, DbSession, TenantId
from app.models import Alert
from app.rate_limit import limiter
from app.schemas.alert import AlertCreate, AlertOut, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
@limiter.limit("60/minute")
async def list_alerts(request: Request, db: DbSession, tenant_id: TenantId):
    result = await db.execute(
        select(Alert).where(Alert.tenant_id == tenant_id).order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.post("", response_model=AlertOut, status_code=201)
@limiter.limit("20/minute")
async def create_alert(
    request: Request, body: AlertCreate, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId
):
    alert = Alert(
        tenant_id=tenant_id,
        user_id=user_id,
        alert_type=body.alert_type,
        signal_types=body.signal_types,
        min_confidence_score=body.min_confidence_score,
        min_severity_score=body.min_severity_score,
        states=body.states,
        company_ids=body.company_ids,
        watchlist_only=body.watchlist_only,
        delivery_method=body.delivery_method,
        frequency=body.frequency,
    )
    db.add(alert)
    await db.flush()
    return AlertOut.model_validate(alert)


@router.put("/{alert_id}", response_model=AlertOut)
@limiter.limit("20/minute")
async def update_alert(
    request: Request, alert_id: UUID, body: AlertUpdate, db: DbSession, tenant_id: TenantId
):
    alert = await db.get(Alert, alert_id)
    if not alert or alert.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Alert not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)
    await db.flush()
    return AlertOut.model_validate(alert)


@router.delete("/{alert_id}", status_code=204)
@limiter.limit("20/minute")
async def delete_alert(request: Request, alert_id: UUID, db: DbSession, tenant_id: TenantId):
    alert = await db.get(Alert, alert_id)
    if not alert or alert.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
