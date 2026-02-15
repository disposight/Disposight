from datetime import datetime, timezone

import structlog

from app.processing.llm_client import llm_client
from app.processing.prompts import SIGNAL_ANALYSIS_PROMPT

logger = structlog.get_logger()

CACHE_TTL_HOURS = 24


def _is_cache_valid(metadata: dict) -> bool:
    """Check if cached analysis is less than 24h old."""
    generated_at = metadata.get("analysis_generated_at")
    if not generated_at:
        return False
    try:
        ts = datetime.fromisoformat(generated_at)
        age = datetime.now(timezone.utc) - ts
        return age.total_seconds() < CACHE_TTL_HOURS * 3600
    except (ValueError, TypeError):
        return False


async def generate_signal_analysis(
    signal,
    company,
    raw_text: str | None,
    correlated_signals: list | None,
    force_refresh: bool = False,
) -> dict:
    """Generate an AI analysis for a signal, with 24h caching in metadata_."""
    metadata = signal.metadata_ or {}

    # Return cached if valid and not forcing refresh
    if not force_refresh and _is_cache_valid(metadata):
        cached = metadata.get("analysis", {})
        cached["cached"] = True
        cached["generated_at"] = metadata["analysis_generated_at"]
        return cached

    # Build location string
    location_parts = []
    if signal.location_city:
        location_parts.append(signal.location_city)
    if signal.location_state:
        location_parts.append(signal.location_state)
    location = ", ".join(location_parts) or "Unknown"

    # Build correlated signals text
    if correlated_signals:
        corr_lines = []
        for cs in correlated_signals:
            corr_lines.append(f"- [{cs.signal_type}] {cs.title} (severity: {cs.severity_score}, source: {cs.source_name})")
        correlated_text = "\n".join(corr_lines)
    else:
        correlated_text = "No correlated signals found."

    prompt = SIGNAL_ANALYSIS_PROMPT.format(
        signal_type=signal.signal_type,
        title=signal.title,
        summary=signal.summary or "N/A",
        severity_score=signal.severity_score,
        confidence_score=signal.confidence_score,
        affected_employees=signal.affected_employees or "Unknown",
        device_estimate=signal.device_estimate or "Unknown",
        location=location,
        company_name=company.name if company else "Unknown",
        industry=company.industry if company else "Unknown",
        sector=company.sector if company else "Unknown",
        employee_count=company.employee_count if company else "Unknown",
        risk_score=company.composite_risk_score if company else 0,
        risk_trend=company.risk_trend if company else "unknown",
        raw_text=(raw_text or "No source text available.")[:2000],
        correlated_signals=correlated_text,
    )

    logger.info("generating_signal_analysis", signal_id=str(signal.id))
    analysis = await llm_client.complete_json(prompt, model="haiku", max_tokens=2048)

    # Ensure required fields
    now = datetime.now(timezone.utc).isoformat()
    analysis.setdefault("event_breakdown", "")
    analysis.setdefault("asset_impact", "")
    analysis.setdefault("company_context", "")
    analysis.setdefault("asset_opportunity", "")
    analysis.setdefault("opportunity_score", 50)
    analysis.setdefault("recommended_actions", [])
    analysis.setdefault("likely_asset_types", [])
    analysis.setdefault("correlated_signals_summary", None if not correlated_signals else analysis.get("correlated_signals_summary"))

    # Cache in metadata
    metadata["analysis"] = {k: v for k, v in analysis.items()}
    metadata["analysis_generated_at"] = now

    analysis["generated_at"] = now
    analysis["cached"] = False
    return analysis
