"""Signal correlation engine — core differentiator.

Links signals about the same company from multiple sources into correlation groups.
Multi-source confirmation significantly elevates risk scoring.
"""

import uuid
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Signal

logger = structlog.get_logger()

CORRELATION_WINDOW_DAYS = 14


async def correlate_signal(db: AsyncSession, signal: Signal) -> uuid.UUID | None:
    """Find or create a correlation group for this signal."""
    # Look for recent signals about the same company from different sources
    cutoff = datetime.now(timezone.utc) - timedelta(days=CORRELATION_WINDOW_DAYS)

    result = await db.execute(
        select(Signal)
        .where(
            Signal.company_id == signal.company_id,
            Signal.id != signal.id,
            Signal.created_at >= cutoff,
        )
        .order_by(Signal.created_at.desc())
    )
    related = result.scalars().all()

    if not related:
        return None

    # Check if any related signal already has a correlation group
    existing_group = None
    for s in related:
        if s.correlation_group_id:
            existing_group = s.correlation_group_id
            break

    # Different source category = strong correlation
    related_categories = {s.signal_category for s in related}
    if signal.signal_category not in related_categories or existing_group:
        group_id = existing_group or uuid.uuid4()
        signal.correlation_group_id = group_id

        # Update related signals without a group
        for s in related:
            if not s.correlation_group_id:
                s.correlation_group_id = group_id

        logger.info(
            "correlation.group_formed",
            company_id=str(signal.company_id),
            group_id=str(group_id),
            signal_count=len(related) + 1,
            categories=list(related_categories | {signal.signal_category}),
        )

        return group_id

    return None
