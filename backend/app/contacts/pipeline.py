"""Contact discovery pipeline — orchestrates find → build → validate."""

from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contacts.contact_finder import find_contacts_for_company
from app.contacts.email_builder import build_emails_for_contact
from app.contacts.email_validator import waterfall_validate
from app.models.company import Company
from app.models.contact import Contact

logger = structlog.get_logger()


async def discover_contacts(db: AsyncSession, company: Company) -> list[Contact]:
    """Run the full contact discovery pipeline for a company.

    1. Scrape website for leadership contacts (with phones from AI)
    2. Build email addresses for each contact
    3. Validate emails via MX/SMTP waterfall
    4. Keep top 5 by decision_maker_score
    """
    if not company.domain:
        return []

    # Mark as attempted at the START to prevent concurrent runs
    company.contacts_found_at = datetime.now(timezone.utc)

    # Step 1: Find contacts from website
    contacts = await find_contacts_for_company(db, company)
    if not contacts:
        await db.flush()
        return []

    domain = company.domain
    smtp_blocked = False  # Track whether SMTP is blocked for this domain

    # Step 2 & 3: Build and validate emails for each contact
    for contact in contacts:
        if contact.first_name and contact.last_name:
            await build_emails_for_contact(db, contact, domain)

            if not smtp_blocked:
                status, winning_email, pattern_used = await waterfall_validate(contact, domain, db)
                contact.email_status = status
                if winning_email and winning_email != contact.email:
                    contact.email = winning_email
                if pattern_used:
                    contact.email_pattern_used = pattern_used
                # If waterfall fell back to unverified, SMTP is likely blocked
                if status == "unverified":
                    smtp_blocked = True

    # Step 4: Sort by score, keep top 5
    contacts.sort(key=lambda c: c.decision_maker_score or 0, reverse=True)
    contacts = contacts[:5]

    await db.flush()

    logger.info(
        "contacts.pipeline_complete",
        company=company.name,
        domain=domain,
        count=len(contacts),
    )

    return contacts


async def get_or_discover_contacts(db: AsyncSession, company: Company) -> list[Contact]:
    """Get cached contacts or run discovery pipeline.

    1. Check DB for existing contacts
    2. If found → return immediately
    3. If contacts_found_at is set but no contacts → return [] (already tried)
    4. Otherwise → run discover_contacts()
    """
    # Check for existing contacts
    result = await db.execute(
        select(Contact)
        .where(Contact.company_id == company.id)
        .order_by(Contact.decision_maker_score.desc().nullslast())
        .limit(5)
    )
    existing = list(result.scalars().all())

    if existing:
        return existing

    # Already tried and found none
    if company.contacts_found_at is not None:
        return []

    # Run discovery
    return await discover_contacts(db, company)
