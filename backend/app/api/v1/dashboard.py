from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.v1.deps import DbSession, TenantId
from app.models import Alert, Company, Signal, SignalSource, Watchlist
from app.schemas.dashboard import DashboardResponse, DashboardStats, PipelineHealthItem
from app.schemas.signal import SignalOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardResponse)
async def get_stats(db: DbSession, tenant_id: TenantId):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Signals today
    signals_today = (
        await db.execute(
            select(func.count(Signal.id)).where(Signal.created_at >= today_start)
        )
    ).scalar() or 0

    # High risk companies (score >= 60)
    high_risk = (
        await db.execute(
            select(func.count(Company.id)).where(Company.composite_risk_score >= 60)
        )
    ).scalar() or 0

    # Watchlist count for this tenant
    watchlist_count = (
        await db.execute(
            select(func.count(Watchlist.id)).where(Watchlist.tenant_id == tenant_id)
        )
    ).scalar() or 0

    # Active alerts for this tenant
    active_alerts = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.tenant_id == tenant_id, Alert.is_active == True
            )
        )
    ).scalar() or 0

    # Recent signals (last 24h, top 10)
    result = await db.execute(
        select(Signal, Company.name.label("company_name"))
        .join(Company, Signal.company_id == Company.id)
        .where(Signal.created_at >= now - timedelta(hours=24))
        .order_by(Signal.created_at.desc())
        .limit(10)
    )
    rows = result.all()
    recent = []
    for row in rows:
        out = SignalOut.model_validate(row[0])
        out.company_name = row[1]
        recent.append(out)

    return DashboardResponse(
        stats=DashboardStats(
            signals_today=signals_today,
            high_risk_companies=high_risk,
            watchlist_count=watchlist_count,
            active_alerts=active_alerts,
        ),
        recent_signals=recent,
    )


@router.get("/pipeline-health", response_model=list[PipelineHealthItem])
async def pipeline_health(db: DbSession):
    result = await db.execute(select(SignalSource).order_by(SignalSource.name))
    sources = result.scalars().all()
    return [
        PipelineHealthItem(
            name=s.name,
            source_type=s.source_type,
            is_enabled=s.is_enabled,
            last_run_at=s.last_run_at.isoformat() if s.last_run_at else None,
            last_run_status=s.last_run_status,
            last_run_signals_count=s.last_run_signals_count,
            last_run_duration_ms=s.last_run_duration_ms,
            error_count=s.error_count,
            last_error=s.last_error,
        )
        for s in sources
    ]
