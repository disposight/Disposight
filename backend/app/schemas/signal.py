from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SignalOut(BaseModel):
    id: UUID
    company_id: UUID
    signal_type: str
    signal_category: str
    title: str
    summary: str | None = None
    confidence_score: int
    severity_score: int
    source_name: str
    source_url: str | None = None
    source_published_at: datetime | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    affected_employees: int | None = None
    device_estimate: int | None = None
    correlation_group_id: UUID | None = None
    created_at: datetime

    # Joined fields
    company_name: str | None = None

    model_config = {"from_attributes": True}


class SignalListResponse(BaseModel):
    signals: list[SignalOut]
    total: int
    page: int
    per_page: int
