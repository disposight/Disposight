from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ContactOut(BaseModel):
    id: UUID
    company_id: UUID
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    title: str | None = None
    seniority_level: str | None = None
    decision_maker_score: int | None = None
    email: str | None = None
    email_status: str = "unverified"
    phone: str | None = None
    linkedin_url: str | None = None
    discovery_source: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactsResponse(BaseModel):
    contacts: list[ContactOut]
    company_id: UUID
    company_name: str
    status: str  # "found" | "none_found" | "no_domain"
    total: int
