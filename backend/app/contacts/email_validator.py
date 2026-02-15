"""Email validator — waterfall MX + SMTP verification.

Waterfall approach for maximum deliverability:
1. Quick MX check — does the domain accept email at all?
2. Catch-all detection — if domain accepts everything, mark as risky
3. SMTP verify ALL email permutations — first "accepted" wins
4. Try multiple MX hosts if first is inconclusive
5. Pattern intelligence fallback — use cached patterns if SMTP is blocked
6. Default to first.last (statistically most common at ~60% of companies)

Status flow: unverified → valid / invalid / risky / failed
"""

import asyncio
import random
import string

import dns.resolver
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contacts.email_builder import generate_email_permutations
from app.models.contact import Contact
from app.models.email_pattern import EmailPattern

logger = structlog.get_logger()


async def validate_email(email: str) -> tuple[str, dict]:
    """Validate a single email address. Returns (status, details).

    Status: valid, invalid, risky, failed
    """
    if not email or "@" not in email:
        return "invalid", {"reason": "malformed"}

    domain = email.split("@")[1]
    details: dict = {"domain": domain}

    # Step 1: MX record check
    mx_hosts = await _check_mx(domain)
    if not mx_hosts:
        return "invalid", {**details, "reason": "no_mx_records"}

    details["mx_hosts"] = mx_hosts[:3]

    # Step 2: SMTP verification
    smtp_result = await _smtp_verify(email, mx_hosts[0])
    details["smtp_result"] = smtp_result

    if smtp_result == "accepted":
        # Step 3: Catch-all detection
        is_catch_all = await _check_catch_all(domain, mx_hosts[0])
        details["catch_all"] = is_catch_all

        if is_catch_all:
            return "risky", {**details, "reason": "catch_all_domain"}
        return "valid", details

    elif smtp_result == "rejected":
        return "invalid", {**details, "reason": "smtp_rejected"}

    return "failed", {**details, "reason": "smtp_inconclusive"}


async def waterfall_validate(
    contact: Contact, domain: str, db: AsyncSession
) -> tuple[str, str | None, str | None]:
    """Waterfall email validation: try all permutations until one works.

    Returns (status, winning_email, pattern_used).
    """
    if not contact.first_name or not contact.last_name or not domain:
        return "failed", None, None

    # Step 1: Quick MX check — skip domain entirely if no MX records
    mx_hosts = await _check_mx(domain)
    if not mx_hosts:
        logger.debug("waterfall.no_mx", domain=domain)
        return "invalid", None, None

    # Step 2: Check for catch-all domain first (saves time)
    is_catch_all = await _check_catch_all(domain, mx_hosts[0])
    if is_catch_all:
        # Domain accepts everything — check cached pattern or use first.last
        cached_pattern = await _get_cached_pattern(db, domain)
        permutations = generate_email_permutations(contact.first_name, contact.last_name, domain)

        if cached_pattern:
            for email, pattern_name in permutations:
                if pattern_name == cached_pattern:
                    return "risky", email, pattern_name

        # Default to first.last for catch-all domains
        if permutations:
            return "risky", permutations[0][0], permutations[0][1]
        return "risky", None, None

    # Step 3: Generate all permutations and SMTP verify each one
    permutations = generate_email_permutations(contact.first_name, contact.last_name, domain)

    # Try cached pattern first (most likely to succeed)
    cached_pattern = await _get_cached_pattern(db, domain)
    if cached_pattern:
        permutations = _prioritize_pattern(permutations, cached_pattern)

    consecutive_errors = 0

    for email, pattern_name in permutations:
        # Try primary MX host
        smtp_result = await _smtp_verify(email, mx_hosts[0])

        if smtp_result == "accepted":
            # Winner! Cache this pattern for future contacts at this domain
            await _update_pattern_cache(db, domain, pattern_name, {"catch_all": False})
            logger.info("waterfall.valid", email=email, pattern=pattern_name)
            return "valid", email, pattern_name

        elif smtp_result == "rejected":
            consecutive_errors = 0
            continue

        else:
            consecutive_errors += 1
            if consecutive_errors >= 2:
                logger.debug(
                    "waterfall.smtp_blocked",
                    domain=domain,
                    consecutive_errors=consecutive_errors,
                )
                break

            # Try one backup MX host before moving on
            if len(mx_hosts) > 1:
                smtp_result = await _smtp_verify(email, mx_hosts[1])
                if smtp_result == "accepted":
                    await _update_pattern_cache(db, domain, pattern_name, {"catch_all": False})
                    logger.info("waterfall.valid_backup_mx", email=email, pattern=pattern_name)
                    return "valid", email, pattern_name
                elif smtp_result == "rejected":
                    consecutive_errors = 0
                    continue

        await asyncio.sleep(0.5)

    # Step 4: All SMTP checks failed/inconclusive — pattern intelligence fallback
    if cached_pattern:
        for email, pattern_name in permutations:
            if pattern_name == cached_pattern:
                logger.info("waterfall.pattern_fallback", email=email, pattern=pattern_name)
                return "unverified", email, pattern_name

    # Step 5: Default to first.last (statistically most common)
    if permutations:
        logger.info("waterfall.default_fallback", email=permutations[0][0])
        return "unverified", permutations[0][0], permutations[0][1]

    return "failed", None, None


def _prioritize_pattern(
    permutations: list[tuple[str, str]], cached_pattern: str
) -> list[tuple[str, str]]:
    """Reorder permutations to try cached pattern first."""
    prioritized = []
    rest = []
    for email, pattern_name in permutations:
        if pattern_name == cached_pattern:
            prioritized.append((email, pattern_name))
        else:
            rest.append((email, pattern_name))
    return prioritized + rest


async def _get_cached_pattern(db: AsyncSession, domain: str) -> str | None:
    """Look up cached email pattern for a domain."""
    result = await db.execute(
        select(EmailPattern).where(EmailPattern.domain == domain)
    )
    cached = result.scalar_one_or_none()
    return cached.pattern if cached else None


async def _check_mx(domain: str) -> list[str]:
    """Check MX records for a domain. Returns list of MX hosts."""
    try:
        loop = asyncio.get_event_loop()
        answers = await loop.run_in_executor(
            None, lambda: dns.resolver.resolve(domain, "MX")
        )
        hosts = sorted(answers, key=lambda x: x.preference)
        return [str(r.exchange).rstrip(".") for r in hosts]
    except Exception:
        return []


async def _smtp_verify(email: str, mx_host: str) -> str:
    """Verify email via SMTP RCPT TO command.

    Returns: accepted, rejected, or error
    """
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(mx_host, 25),
            timeout=3.0,
        )

        # Read banner
        await asyncio.wait_for(reader.readline(), timeout=3.0)

        # EHLO
        writer.write(b"EHLO disposight.com\r\n")
        await writer.drain()
        await asyncio.wait_for(reader.readline(), timeout=3.0)

        # MAIL FROM
        writer.write(b"MAIL FROM:<verify@disposight.com>\r\n")
        await writer.drain()
        response = await asyncio.wait_for(reader.readline(), timeout=3.0)

        if not response.startswith(b"250"):
            writer.close()
            return "error"

        # RCPT TO — the key check
        writer.write(f"RCPT TO:<{email}>\r\n".encode())
        await writer.drain()
        response = await asyncio.wait_for(reader.readline(), timeout=3.0)

        # Clean up
        writer.write(b"QUIT\r\n")
        await writer.drain()
        writer.close()

        if response.startswith(b"250"):
            return "accepted"
        elif response.startswith((b"550", b"551", b"552", b"553")):
            return "rejected"
        return "error"

    except Exception as e:
        logger.debug("smtp.verify_failed", email=email, error=str(e))
        return "error"


async def _check_catch_all(domain: str, mx_host: str) -> bool:
    """Test if domain is catch-all by sending to a random address."""
    random_user = "".join(random.choices(string.ascii_lowercase, k=12))
    random_email = f"{random_user}@{domain}"
    result = await _smtp_verify(random_email, mx_host)
    return result == "accepted"


async def _update_pattern_cache(
    db: AsyncSession, domain: str, pattern: str, details: dict
) -> None:
    """Cache the email pattern for a domain."""
    result = await db.execute(
        select(EmailPattern).where(EmailPattern.domain == domain)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.pattern = pattern
        existing.mx_valid = True
        existing.has_catch_all = details.get("catch_all", False)
    else:
        ep = EmailPattern(
            domain=domain,
            pattern=pattern,
            mx_valid=True,
            has_catch_all=details.get("catch_all", False),
        )
        db.add(ep)
