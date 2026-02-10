from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select

from app.api.v1.deps import CurrentUserId, DbSession, TenantId, TenantPlan
from app.models import Alert
from app.plan_limits import raise_plan_limit
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
    request: Request, body: AlertCreate, db: DbSession, tp: TenantPlan, user_id: CurrentUserId
):
    tenant_id = tp.tenant_id
    limits = tp.limits

    # Enforce frequency restriction
    freq = body.frequency or "realtime"
    if freq not in limits.allowed_alert_frequencies:
        raise_plan_limit(
            "alert_frequency",
            tp.plan,
            f"'{freq}' alerts require an upgrade. Allowed: {', '.join(limits.allowed_alert_frequencies)}.",
        )

    # Enforce active alerts cap
    count_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.tenant_id == tenant_id, Alert.is_active == True  # noqa: E712
        )
    )
    active_count = count_result.scalar() or 0
    if active_count >= limits.max_active_alerts:
        raise_plan_limit(
            "active_alerts",
            tp.plan,
            f"Active alert limit reached ({active_count}/{limits.max_active_alerts}). Upgrade for more.",
        )

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
    request: Request, alert_id: UUID, body: AlertUpdate, db: DbSession, tp: TenantPlan
):
    tenant_id = tp.tenant_id
    alert = await db.get(Alert, alert_id)
    if not alert or alert.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Validate frequency if being changed
    updates = body.model_dump(exclude_unset=True)
    if "frequency" in updates and updates["frequency"] not in tp.limits.allowed_alert_frequencies:
        raise_plan_limit(
            "alert_frequency",
            tp.plan,
            f"'{updates['frequency']}' alerts require an upgrade. Allowed: {', '.join(tp.limits.allowed_alert_frequencies)}.",
        )

    for field, value in updates.items():
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
