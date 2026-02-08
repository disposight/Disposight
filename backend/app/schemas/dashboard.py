from pydantic import BaseModel

from app.schemas.signal import SignalOut


class DashboardStats(BaseModel):
    signals_today: int
    high_risk_companies: int
    watchlist_count: int
    active_alerts: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_signals: list[SignalOut]


class PipelineHealthItem(BaseModel):
    name: str
    source_type: str
    is_enabled: bool
    last_run_at: str | None = None
    last_run_status: str | None = None
    last_run_signals_count: int
    last_run_duration_ms: int | None = None
    error_count: int
    last_error: str | None = None
