"""Deal Rank Score — 0-100 revenue-prioritization metric.

Answers "who should I call next?" by weighting eight factors tuned to
DispoSight's four pipelines (WARN, GDELT, SEC EDGAR, CourtListener)
and the 100+ device gate.

Weight budget (sums to ~100):
    Device volume        ~24 pts  (log scale)
    Urgency              ~18 pts  (event-type tier)
    Recency              ~14 pts  (exponential decay)
    Source corroboration  ~12 pts  (multi-source confirmation)
    Source trust          ~10 pts  (gov/court > news)
    Extraction confidence ~10 pts  (NLP quality)
    Composite risk         ~7 pts  (company-level distress)
    Risk trend             ~5 pts  (rising > stable > declining)
    + guardrails / boosts  ±3-15
"""

import math
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Score bands
# ---------------------------------------------------------------------------

SCORE_BANDS: dict[str, dict] = {
    "immediate_pursuit": {"min": 85, "max": 100, "label": "Immediate Pursuit", "color": "critical"},
    "high_priority":     {"min": 70, "max": 84,  "label": "High Priority",     "color": "high"},
    "qualified_pipeline":{"min": 55, "max": 69,  "label": "Qualified Pipeline", "color": "medium"},
    "background":        {"min": 0,  "max": 54,  "label": "Background",         "color": "low"},
}


def get_band(score: int) -> tuple[str, str]:
    """Return (band_key, band_label) for a given score."""
    if score >= 85:
        return "immediate_pursuit", "Immediate Pursuit"
    if score >= 70:
        return "high_priority", "High Priority"
    if score >= 55:
        return "qualified_pipeline", "Qualified Pipeline"
    return "background", "Background"


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class ScoreFactor:
    name: str
    points: float
    max_points: float
    summary: str


@dataclass
class DealScoreResult:
    score: int
    band: str
    band_label: str
    factors: list[ScoreFactor] = field(default_factory=list)
    top_factors: list[str] = field(default_factory=list)
    penalty_applied: bool = False
    boost_applied: bool = False


# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------

# How fast assets hit the secondary market (higher = more urgent)
URGENCY_MAP: dict[str, float] = {
    "bankruptcy_ch7": 18.0,
    "liquidation": 18.0,
    "ceasing_operations": 18.0,
    "office_closure": 14.0,
    "facility_shutdown": 14.0,
    "shutdown": 14.0,
    "plant_closing": 9.0,
    "layoff": 9.0,
    "bankruptcy_ch11": 9.0,
    "restructuring": 9.0,
    "merger": 4.0,
    "acquisition": 4.0,
    "relocation": 4.0,
}

# Human-readable urgency labels
URGENCY_LABELS: dict[str, str] = {
    "bankruptcy_ch7": "Ch. 7 liquidation — assets selling immediately",
    "liquidation": "Liquidation — assets selling immediately",
    "ceasing_operations": "Ceasing operations — full shutdown underway",
    "office_closure": "Office closure — facilities being vacated",
    "facility_shutdown": "Facility shutdown — site being decommissioned",
    "shutdown": "Shutdown — operations ceasing",
    "plant_closing": "Plant closing — moderate timeline",
    "layoff": "Layoff — moderate timeline",
    "bankruptcy_ch11": "Ch. 11 restructuring — assets may be released",
    "restructuring": "Restructuring — assets may be released",
    "merger": "M&A activity — asset disposition possible",
    "acquisition": "Acquisition — asset disposition possible",
    "relocation": "Relocation — surplus from old site",
}

# Per-source reliability (government / court filings >> news)
SOURCE_TRUST: dict[str, float] = {
    "warn_act": 10.0,
    "courtlistener": 9.5,
    "sec_edgar": 9.0,
    "gdelt": 4.0,
}

SOURCE_LABELS: dict[str, str] = {
    "warn_act": "WARN Act filing — government-verified",
    "courtlistener": "Court filing — legally verified",
    "sec_edgar": "SEC filing — regulatory disclosure",
    "gdelt": "News source — lower confidence",
}

HIGH_TRUST_SOURCES = {"warn_act", "sec_edgar", "courtlistener"}

TREND_SCORES: dict[str, float] = {
    "rising": 5.0,
    "stable": 2.5,
    "declining": 0.0,
}


# ---------------------------------------------------------------------------
# Factor summarizers
# ---------------------------------------------------------------------------

def _summarize_device(total_devices: int, points: float) -> str:
    if total_devices >= 5000:
        return f"{total_devices:,} devices — enterprise-scale volume"
    if total_devices >= 1000:
        return f"{total_devices:,} devices — large volume"
    if total_devices >= 100:
        return f"~{total_devices:,} devices estimated"
    return f"~{total_devices:,} devices — small volume"


def _summarize_urgency(signal_types: list[str], best_type: str) -> str:
    return URGENCY_LABELS.get(best_type, f"{best_type} — standard timeline")


def _summarize_recency(days_since: int) -> str:
    if days_since == 0:
        return "Detected today"
    if days_since <= 3:
        return f"Detected {days_since} days ago — very fresh"
    if days_since <= 7:
        return f"Detected {days_since} days ago"
    return f"Detected {days_since} days ago — aging"


def _summarize_corroboration(source_diversity: int) -> str:
    if source_diversity >= 3:
        return f"Confirmed by {source_diversity} independent sources"
    if source_diversity == 2:
        return "Confirmed by 2 independent sources"
    return "Single source only"


def _summarize_trust(source_names: list[str], best_source: str) -> str:
    return SOURCE_LABELS.get(best_source, f"{best_source} — unverified source")


def _summarize_confidence(avg_confidence: float) -> str:
    pct = int(round(avg_confidence))
    if avg_confidence >= 80:
        return f"High extraction confidence ({pct}%)"
    if avg_confidence >= 60:
        return f"Moderate confidence ({pct}%)"
    return f"Low confidence ({pct}%)"


def _summarize_risk(composite_risk_score: int) -> str:
    return f"Company risk score {composite_risk_score}/100"


def _summarize_trend(risk_trend: str) -> str:
    if risk_trend == "rising":
        return "Risk trend rising — deteriorating"
    if risk_trend == "declining":
        return "Risk trend declining — improving"
    return "Stable risk profile"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_deal_score(
    avg_severity: float,
    avg_confidence: float,
    composite_risk_score: int,
    total_devices: int,
    source_diversity: int,
    signal_types: list[str],
    days_since_latest: int,
    source_names: list[str],
    risk_trend: str,
    signal_count: int,
) -> DealScoreResult:
    """Compute a 0-100 deal-rank score for an opportunity.

    Returns a DealScoreResult with the score, band, factor breakdown,
    and top factor summaries so reps understand *why* a deal is ranked.
    """

    # --- 1. Device volume (~24 pts, log scale) ---
    clamped_devices = max(total_devices, 1)
    device_score = min(
        24.0,
        24.0 * math.log1p(clamped_devices / 100) / math.log1p(300),
    )

    # --- 2. Urgency (~18 pts) ---
    best_urgency_type = max(
        signal_types,
        key=lambda t: URGENCY_MAP.get(t, 4.0),
        default="unknown",
    ) if signal_types else "unknown"
    urgency_score = URGENCY_MAP.get(best_urgency_type, 4.0)

    # --- 3. Recency (~14 pts, exponential decay) ---
    recency_score = 14.0 * math.exp(-days_since_latest / 10.0)

    # --- 4. Source corroboration (~12 pts) ---
    if source_diversity <= 1:
        corroboration_score = 0.0
    else:
        corroboration_score = min(
            12.0,
            12.0 * math.log1p(source_diversity - 1) / math.log1p(3),
        )

    # --- 5. Source trust (~10 pts) ---
    best_source = max(
        source_names,
        key=lambda s: SOURCE_TRUST.get(s, 3.0),
        default="unknown",
    ) if source_names else "unknown"
    trust_score = SOURCE_TRUST.get(best_source, 3.0)

    # --- 6. Extraction confidence (~10 pts) ---
    confidence_score = (min(avg_confidence, 100.0) / 100.0) * 10.0

    # --- 7. Composite company risk (~7 pts) ---
    risk_score = (min(composite_risk_score, 100) / 100.0) * 7.0

    # --- 8. Risk trend (~5 pts) ---
    trend_score = TREND_SCORES.get(risk_trend, 2.5)

    # --- Guardrails ---
    penalty = 0.0
    boost = 0.0

    has_high_trust = any(s in HIGH_TRUST_SOURCES for s in source_names)
    if signal_count == 1 and not has_high_trust and avg_confidence < 60:
        penalty = 15.0

    if has_high_trust:
        boost = 3.0

    raw = (
        device_score
        + urgency_score
        + recency_score
        + corroboration_score
        + trust_score
        + confidence_score
        + risk_score
        + trend_score
        - penalty
        + boost
    )

    final_score = max(0, min(100, int(round(raw))))
    band, band_label = get_band(final_score)

    # Build factor breakdown
    factors = [
        ScoreFactor("Device Volume", round(device_score, 1), 24.0,
                     _summarize_device(total_devices, device_score)),
        ScoreFactor("Urgency", round(urgency_score, 1), 18.0,
                     _summarize_urgency(signal_types, best_urgency_type)),
        ScoreFactor("Recency", round(recency_score, 1), 14.0,
                     _summarize_recency(days_since_latest)),
        ScoreFactor("Corroboration", round(corroboration_score, 1), 12.0,
                     _summarize_corroboration(source_diversity)),
        ScoreFactor("Source Trust", round(trust_score, 1), 10.0,
                     _summarize_trust(source_names, best_source)),
        ScoreFactor("Confidence", round(confidence_score, 1), 10.0,
                     _summarize_confidence(avg_confidence)),
        ScoreFactor("Company Risk", round(risk_score, 1), 7.0,
                     _summarize_risk(composite_risk_score)),
        ScoreFactor("Risk Trend", round(trend_score, 1), 5.0,
                     _summarize_trend(risk_trend)),
    ]

    # Top 3 factors by contribution ratio
    ranked = sorted(factors, key=lambda f: f.points / f.max_points if f.max_points > 0 else 0, reverse=True)
    top_factors = [f.summary for f in ranked[:3]]

    return DealScoreResult(
        score=final_score,
        band=band,
        band_label=band_label,
        factors=factors,
        top_factors=top_factors,
        penalty_applied=penalty > 0,
        boost_applied=boost > 0,
    )
