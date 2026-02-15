"""Contact discovery endpoints."""

from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, Request

from app.api.v1.deps import DbSession, TenantPlan
from app.contacts.pipeline import get_or_discover_contacts
from app.models.company import Company
from app.plan_limits import raise_plan_limit
from app.rate_limit import limiter
from app.schemas.contact import ContactOut, ContactsResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("/{company_id}/find", response_model=ContactsResponse)
@limiter.limit("10/minute")
async def find_contacts(
    request: Request,
    company_id: UUID,
    db: DbSession,
    tp: TenantPlan,
):
    """Trigger contact discovery for a company. Paid plans only."""
    if tp.limits.contacts_per_day == 0:
        raise_plan_limit(
            "contacts",
            tp.plan,
            "Contact discovery requires a paid plan. Upgrade to find decision-makers.",
        )

    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not company.domain:
        return ContactsResponse(
            contacts=[],
            company_id=company.id,
            company_name=company.name,
            status="no_domain",
            total=0,
        )

    contacts = await get_or_discover_contacts(db, company)
    await db.commit()

    status = "found" if contacts else "none_found"

    return ContactsResponse(
        contacts=[ContactOut.model_validate(c) for c in contacts],
        company_id=company.id,
        company_name=company.name,
        status=status,
        total=len(contacts),
    )


@router.get("/{company_id}", response_model=ContactsResponse)
@limiter.limit("60/minute")
async def get_contacts(
    request: Request,
    company_id: UUID,
    db: DbSession,
    tp: TenantPlan,
):
    """Get cached contacts for a company."""
    if tp.limits.contacts_per_day == 0:
        raise_plan_limit(
            "contacts",
            tp.plan,
            "Contact discovery requires a paid plan. Upgrade to find decision-makers.",
        )

    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    from sqlalchemy import select
    from app.models.contact import Contact

    result = await db.execute(
        select(Contact)
        .where(Contact.company_id == company_id)
        .order_by(Contact.decision_maker_score.desc().nullslast())
        .limit(5)
    )
    contacts = list(result.scalars().all())

    status = "found" if contacts else "none_found"
    if not company.domain:
        status = "no_domain"

    return ContactsResponse(
        contacts=[ContactOut.model_validate(c) for c in contacts],
        company_id=company.id,
        company_name=company.name,
        status=status,
        total=len(contacts),
    )
