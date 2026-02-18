from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

VALID_STATUSES = {"identified", "researching", "contacted", "negotiating", "won", "lost"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}


class WatchlistAdd(BaseModel):
    company_id: UUID
    notes: str | None = None


class WatchlistOut(BaseModel):
    id: UUID
    company_id: UUID
    notes: str | None = None
    status: str = "identified"
    claimed_by: UUID | None = None
    claimed_at: datetime | None = None
    created_at: datetime
    priority: str = "medium"
    follow_up_at: datetime | None = None
    last_activity_at: datetime | None = None
    closed_at: datetime | None = None
    lost_reason: str | None = None

    # Joined
    company_name: str | None = None
    composite_risk_score: int | None = None
    deal_score: int | None = None
    claimed_by_name: str | None = None
    activity_count: int = 0

    model_config = {"from_attributes": True}


class WatchlistStatusUpdate(BaseModel):
    status: str
    lost_reason: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return v


class WatchlistPriorityUpdate(BaseModel):
    priority: str

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}")
        return v


class WatchlistFollowUpUpdate(BaseModel):
    follow_up_at: datetime | None = None


class PipelineActivityCreate(BaseModel):
    activity_type: str
    title: str
    body: str | None = None

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, v: str) -> str:
        valid = {"note", "call", "email", "meeting"}
        if v not in valid:
            raise ValueError(f"Activity type must be one of: {', '.join(sorted(valid))}")
        return v


class PipelineActivityOut(BaseModel):
    id: UUID
    watchlist_id: UUID
    user_id: UUID
    activity_type: str
    title: str
    body: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    user_name: str | None = None

    model_config = {"from_attributes": True}


class FollowUpItem(BaseModel):
    watchlist_id: UUID
    company_id: UUID
    company_name: str | None = None
    follow_up_at: datetime
    status: str
    priority: str
    is_overdue: bool = False
    days_until: int = 0
    claimed_by_name: str | None = None


class PipelineSummary(BaseModel):
    total: int = 0
    by_status: dict[str, int] = {}
    overdue_follow_ups: int = 0
    won_this_month: int = 0
    lost_this_month: int = 0
