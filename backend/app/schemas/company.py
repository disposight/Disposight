from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CompanyOut(BaseModel):
    id: UUID
    name: str
    normalized_name: str
    ticker: str | None = None
    cik: str | None = None
    domain: str | None = None
    industry: str | None = None
    sector: str | None = None
    employee_count: int | None = None
    headquarters_city: str | None = None
    headquarters_state: str | None = None
    headquarters_lat: float | None = None
    headquarters_lng: float | None = None
    composite_risk_score: int
    signal_count: int
    last_signal_at: datetime | None = None
    risk_trend: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyListResponse(BaseModel):
    companies: list[CompanyOut]
    total: int
    page: int
    per_page: int
