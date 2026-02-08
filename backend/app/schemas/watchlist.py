from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WatchlistAdd(BaseModel):
    company_id: UUID
    notes: str | None = None


class WatchlistOut(BaseModel):
    id: UUID
    company_id: UUID
    notes: str | None = None
    created_at: datetime

    # Joined
    company_name: str | None = None
    composite_risk_score: int | None = None

    model_config = {"from_attributes": True}
