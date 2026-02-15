from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.signal import SignalOut


class ScoreFactorOut(BaseModel):
    name: str
    points: float
    max_points: float
    summary: str


class ScoreBreakdownOut(BaseModel):
    factors: list[ScoreFactorOut]
    top_factors: list[str]
    band: str
    band_label: str
    penalty_applied: bool
    boost_applied: bool


class OpportunityOut(BaseModel):
    company_id: UUID
    company_name: str
    ticker: str | None = None
    industry: str | None = None
    headquarters_state: str | None = None
    employee_count: int | None = None
    composite_risk_score: int
    risk_trend: str
    deal_score: int
    score_band: str
    score_band_label: str
    signal_count: int
    total_device_estimate: int
    revenue_estimate: float
    latest_signal_at: datetime
    disposition_window: str
    signal_types: list[str]
    source_names: list[str]
    source_diversity: int
    is_watched: bool = False
    top_factors: list[str] = []
    has_contacts: bool = False
    contact_count: int = 0

    model_config = {"from_attributes": True}


class OpportunityListResponse(BaseModel):
    opportunities: list[OpportunityOut]
    total: int
    page: int
    per_page: int
    total_pipeline_value: float
    total_devices: int


class OpportunityDetailOut(OpportunityOut):
    signals: list[SignalOut]
    avg_confidence: float
    avg_severity: float
    recommended_actions: list[str] | None = None
    asset_opportunity: str | None = None
    likely_asset_types: list[dict] = []
    score_breakdown: ScoreBreakdownOut | None = None
    signal_velocity: float = 0.0
    domain: str | None = None


class CommandCenterStats(BaseModel):
    total_pipeline_value: float
    pipeline_value_change_7d: float
    new_opportunities_today: int
    hot_opportunities: int
    total_active_opportunities: int
    total_devices_in_pipeline: int
    watchlist_count: int
    top_opportunities: list[OpportunityOut]
