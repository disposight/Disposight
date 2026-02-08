from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, Signal

logger = structlog.get_logger()

# Category diversity multiplier
CATEGORY_WEIGHTS = {
    "warn": 1.0,
    "bankruptcy": 1.2,
    "filing": 0.8,
    "news": 0.6,
}


async def update_company_risk_score(db: AsyncSession, company_id) -> int:
    """Recalculate composite risk score for a company based on recent signals."""
    company = await db.get(Company, company_id)
    if not company:
        return 0

    # Get signals from last 90 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    result = await db.execute(
        select(Signal)
        .where(Signal.company_id == company_id, Signal.created_at >= cutoff)
        .order_by(Signal.created_at.desc())
    )
    signals = result.scalars().all()

    if not signals:
        company.composite_risk_score = 0
        company.risk_trend = "stable"
        company.signal_count = 0
        return 0

    # Weighted average of signal scores with time decay
    now = datetime.now(timezone.utc)
    total_weight = 0
    weighted_score = 0
    categories = set()

    for signal in signals:
        age_days = max(1, (now - signal.created_at).days)
        time_decay = max(0.3, 1.0 - (age_days / 90))

        category_weight = CATEGORY_WEIGHTS.get(signal.signal_category, 0.5)
        weight = time_decay * category_weight

        score = (signal.confidence_score + signal.severity_score) / 2
        weighted_score += score * weight
        total_weight += weight
        categories.add(signal.signal_category)

    base_score = weighted_score / total_weight if total_weight > 0 else 0

    # Category diversity multiplier (multi-source confirmation)
    diversity_multiplier = 1.0 + (len(categories) - 1) * 0.15
    # Velocity multiplier (many signals in short time)
    velocity_multiplier = min(1.5, 1.0 + len(signals) * 0.05)

    composite = int(min(100, base_score * diversity_multiplier * velocity_multiplier))

    # Determine trend
    recent_cutoff = now - timedelta(days=14)
    recent_signals = [s for s in signals if s.created_at >= recent_cutoff]
    older_signals = [s for s in signals if s.created_at < recent_cutoff]

    if len(recent_signals) > len(older_signals):
        trend = "rising"
    elif len(recent_signals) < len(older_signals) and len(recent_signals) == 0:
        trend = "declining"
    else:
        trend = "stable"

    company.composite_risk_score = composite
    company.risk_trend = trend
    company.signal_count = len(signals)
    company.last_signal_at = signals[0].created_at

    logger.info(
        "risk_scorer.updated",
        company=company.name,
        score=composite,
        trend=trend,
        signal_count=len(signals),
        categories=list(categories),
    )

    return composite
