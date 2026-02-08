from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AlertCreate(BaseModel):
    alert_type: str
    signal_types: list[str] = []
    min_confidence_score: int = 50
    min_severity_score: int = 0
    states: list[str] = []
    company_ids: list[UUID] = []
    watchlist_only: bool = False
    delivery_method: str = "email"
    frequency: str = "realtime"


class AlertUpdate(BaseModel):
    signal_types: list[str] | None = None
    min_confidence_score: int | None = None
    min_severity_score: int | None = None
    states: list[str] | None = None
    company_ids: list[UUID] | None = None
    watchlist_only: bool | None = None
    delivery_method: str | None = None
    frequency: str | None = None
    is_active: bool | None = None


class AlertOut(BaseModel):
    id: UUID
    alert_type: str
    signal_types: list[str]
    min_confidence_score: int
    min_severity_score: int
    states: list[str]
    watchlist_only: bool
    delivery_method: str
    frequency: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
