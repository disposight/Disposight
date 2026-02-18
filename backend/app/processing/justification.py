"""Plain-English deal justification engine.

Two generation modes:
- **Compact**: Template-based, pure Python, instant — 2-3 sentences for every card.
- **Full**: LLM-generated, async, cached 24h in company.metadata_ — 4-6 sentence
  paragraph for the detail page, suitable for forwarding to leadership.
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog

from app.processing.deal_scorer import URGENCY_MAP
from app.processing.prompts import DEAL_JUSTIFICATION_PROMPT

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Natural-language verb map  (signal_type -> past-tense verb phrase)
# ---------------------------------------------------------------------------
EVENT_VERBS: dict[str, str] = {
    "bankruptcy_ch7": "filed for Chapter 7 liquidation",
    "liquidation": "entered liquidation",
    "ceasing_operations": "is ceasing operations",
    "office_closure": "is closing office facilities",
    "facility_shutdown": "is shutting down facilities",
    "shutdown": "is shutting down operations",
    "plant_closing": "is closing a plant",
    "layoff": "announced mass layoffs",
    "bankruptcy_ch11": "filed for Chapter 11 restructuring",
    "restructuring": "is undergoing restructuring",
    "merger": "is involved in a merger",
    "acquisition": "is being acquired",
    "relocation": "is relocating operations",
    "facility_closure": "is closing facilities",
    "facility_closing": "is closing facilities",
}

# Human-readable source names for prose
SOURCE_PROSE: dict[str, str] = {
    "warn_act": "WARN Act filing",
    "courtlistener": "court filing",
    "sec_edgar": "SEC filing",
    "gdelt": "news coverage",
}


def _best_signal_type(signal_types: list[str]) -> str:
    """Pick the highest-urgency signal type using URGENCY_MAP ordering."""
    if not signal_types:
        return "layoff"
    return max(signal_types, key=lambda t: URGENCY_MAP.get(t, 4.0))


def _source_evidence(source_names: list[str]) -> str:
    """Build a readable evidence fragment like 'WARN Act filing and news coverage'."""
    labels = []
    for s in source_names:
        label = SOURCE_PROSE.get(s, s.replace("_", " "))
        if label not in labels:
            labels.append(label)
    if len(labels) == 0:
        return ""
    if len(labels) == 1:
        return labels[0]
    return ", ".join(labels[:-1]) + " and " + labels[-1]


# ---------------------------------------------------------------------------
# Compact justification  (template-based, pure Python)
# ---------------------------------------------------------------------------

def generate_compact_justification(
    *,
    company_name: str,
    signal_types: list[str],
    source_names: list[str],
    total_devices: int,
    revenue_estimate: float,
    disposition_window: str,
    deal_score: int,
    score_band: str,
    risk_trend: str,
    source_diversity: int,
    days_since_latest: int,
    penalty_applied: bool,
) -> str:
    """Return a 2-3 sentence plain-English justification for opportunity cards."""

    # --- Sentence 1: What happened ---
    best_type = _best_signal_type(signal_types)
    verb = EVENT_VERBS.get(best_type, f"has a {best_type.replace('_', ' ')} event")

    affected = ""
    if best_type == "layoff" and total_devices > 0:
        # Rough reverse of the 1.5x multiplier in device_filter
        approx_employees = int(total_devices / 1.5) if total_devices > 0 else 0
        if approx_employees > 0:
            affected = f" affecting ~{approx_employees:,} employees"

    evidence = _source_evidence(source_names)
    evidence_clause = f", confirmed by {evidence}" if evidence else ""

    sentence1 = f"{company_name} {verb}{affected}{evidence_clause}."

    # --- Sentence 2: Scale + value ---
    sentence2 = (
        f"An estimated {total_devices:,} surplus devices "
        f"(~${revenue_estimate:,.0f} recovery value) expected within {disposition_window.lower()}."
    )

    # --- Sentence 3: Confidence kicker (pick highest-priority match) ---
    sentence3 = ""
    if risk_trend == "rising" and source_diversity >= 2:
        sentence3 = f"Risk trend rising \u2014 {source_diversity} corroborating sources."
    elif source_diversity >= 3:
        sentence3 = f"High confidence \u2014 verified across {source_diversity} independent sources."
    elif source_diversity == 2:
        sentence3 = "Corroborated by 2 independent sources."
    elif days_since_latest <= 3:
        day_word = "day" if days_since_latest == 1 else "days"
        sentence3 = f"Detected {days_since_latest} {day_word} ago \u2014 time-sensitive."
    elif score_band == "immediate_pursuit":
        sentence3 = f"Immediate pursuit recommended \u2014 scored {deal_score}/100."
    elif penalty_applied:
        sentence3 = "Single unverified source \u2014 proceed with caution."

    parts = [sentence1, sentence2]
    if sentence3:
        parts.append(sentence3)
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Full justification  (LLM-based, async, cached in company.metadata_)
# ---------------------------------------------------------------------------

async def generate_full_justification(
    *,
    company: object,  # Company ORM model
    company_name: str,
    signal_types: list[str],
    source_names: list[str],
    total_devices: int,
    revenue_estimate: float,
    disposition_window: str,
    deal_score: int,
    score_band_label: str,
    risk_trend: str,
    avg_severity: float,
    avg_confidence: float,
    signal_count: int,
) -> tuple[str | None, bool]:
    """Generate a full deal justification via LLM, with 24h caching.

    Returns (justification_text, is_newly_generated).
    - If cached and valid, returns cached text with is_newly_generated=False.
    - If generated fresh, returns new text with is_newly_generated=True.
    - On failure, returns (None, False).
    """
    metadata = getattr(company, "metadata_", None) or {}
    cache = metadata.get("deal_justification_cache")

    # Check cache validity
    if cache and isinstance(cache, dict):
        generated_at = cache.get("generated_at")
        cached_score = cache.get("deal_score_at_generation")
        cached_text = cache.get("text")

        if generated_at and cached_text:
            try:
                gen_time = datetime.fromisoformat(generated_at)
                age_hours = (datetime.now(timezone.utc) - gen_time).total_seconds() / 3600
                score_drift = abs(deal_score - (cached_score or 0))

                if age_hours < 24 and score_drift <= 5:
                    return cached_text, False
            except (ValueError, TypeError):
                pass  # Invalid cache, regenerate

    # Generate fresh justification
    try:
        from app.processing.llm_client import llm_client

        prompt = DEAL_JUSTIFICATION_PROMPT.format(
            company_name=company_name,
            signal_types=", ".join(signal_types),
            source_names=", ".join(source_names),
            total_devices=f"{total_devices:,}",
            revenue_estimate=f"${revenue_estimate:,.0f}",
            disposition_window=disposition_window,
            deal_score=deal_score,
            score_band_label=score_band_label,
            risk_trend=risk_trend,
            avg_severity=f"{avg_severity:.0f}",
            avg_confidence=f"{avg_confidence:.0f}",
            signal_count=signal_count,
        )

        text = await llm_client.complete(prompt, model="haiku", max_tokens=512)
        text = text.strip()

        # Update cache in metadata
        if not metadata:
            metadata = {}
        metadata["deal_justification_cache"] = {
            "text": text,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "deal_score_at_generation": deal_score,
        }
        company.metadata_ = metadata  # type: ignore[attr-defined]

        return text, True

    except Exception:
        logger.warning(
            "justification.llm_failed",
            company_name=company_name,
            exc_info=True,
        )
        return None, False
