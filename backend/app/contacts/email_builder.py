"""Email builder — generate email permutations from name + domain.

Checks email_patterns cache first. If we already know a domain's pattern,
only generates that one permutation.
"""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.email_pattern import EmailPattern

logger = structlog.get_logger()


def generate_email_permutations(first_name: str, last_name: str, domain: str) -> list[tuple[str, str]]:
    """Generate common email permutations for a name + domain.

    Returns list of (email, pattern_name) tuples.
    """
    if not first_name or not last_name or not domain:
        return []

    first = first_name.lower().strip().replace(" ", "")
    last = last_name.lower().strip().replace(" ", "")
    fi = first[0]  # first initial

    return [
        (f"{first}.{last}@{domain}", "first.last"),
        (f"{first}{last}@{domain}", "firstlast"),
        (f"{first}@{domain}", "first"),
        (f"{fi}{last}@{domain}", "flast"),
        (f"{first}.{last[0]}@{domain}", "first.l"),
        (f"{fi}.{last}@{domain}", "f.last"),
        (f"{last}.{first}@{domain}", "last.first"),
        (f"{last}@{domain}", "last"),
    ]


async def build_emails_for_contact(
    db: AsyncSession,
    contact: Contact,
    domain: str,
) -> str | None:
    """Generate and assign the best email for a contact.

    If we have a cached pattern for this domain, use only that.
    Otherwise, generate all permutations — validation will pick the right one.
    """
    if not contact.first_name or not contact.last_name or not domain:
        return None

    # Check cache first
    result = await db.execute(
        select(EmailPattern).where(EmailPattern.domain == domain)
    )
    cached = result.scalar_one_or_none()

    if cached and cached.pattern:
        # We know the pattern — generate just that one
        permutations = generate_email_permutations(contact.first_name, contact.last_name, domain)
        for email, pattern_name in permutations:
            if pattern_name == cached.pattern:
                contact.email = email
                contact.email_pattern_used = pattern_name
                contact.email_status = "unverified"
                return email

    # No cached pattern — use most common format as default
    permutations = generate_email_permutations(contact.first_name, contact.last_name, domain)
    if permutations:
        email, pattern = permutations[0]  # first.last is most common
        contact.email = email
        contact.email_pattern_used = pattern
        contact.email_status = "unverified"
        return email

    return None
