"""Predictive disposition timing model.

Estimates where in the equipment disposition lifecycle each deal currently
sits so reps know not just *what* to prioritize but *when* to act.

Three predicted phases:
  - Early Outreach — distress detected, assets not yet moving
  - Active Liquidation — assets are or will soon be in play
  - Late-Stage — opportunity aging out, most value may be claimed

Rule-based, sub-microsecond, zero API cost.
"""

from dataclasses import dataclass

# Signal types that start directly in active_liquidation
ACTIVE_START_TYPES = frozenset({
    "bankruptcy_ch7",
    "liquidation",
    "ceasing_operations",
    "office_closure",
    "facility_shutdown",
    "shutdown",
})


@dataclass(frozen=True, slots=True)
class TimingPrediction:
    phase: str          # "early_outreach" | "active_liquidation" | "late_stage"
    phase_label: str    # "Early Outreach" | "Active Liquidation" | "Late-Stage"
    verb: str           # "Reach out early" | "Act now" | "Move fast or pass"
    explanation: str    # 1-sentence reason
    confidence: str     # "high" | "medium" | "low"


_PHASE_META: dict[str, dict[str, str]] = {
    "early_outreach": {
        "label": "Early Outreach",
        "verb": "Reach out early",
    },
    "active_liquidation": {
        "label": "Active Liquidation",
        "verb": "Act now",
    },
    "late_stage": {
        "label": "Late-Stage",
        "verb": "Move fast or pass",
    },
}

# Ordered so we can advance forward
_PHASE_ORDER = ["early_outreach", "active_liquidation", "late_stage"]


def _size_multiplier(employee_count: int | None) -> float:
    """Larger orgs take longer to disposition — stretch the decay windows."""
    if employee_count is None or employee_count < 500:
        return 1.0
    if employee_count < 5000:
        return 1.5
    return 2.0


def _initial_phase(signal_types: list[str]) -> str:
    """Determine starting phase from signal type urgency."""
    for st in signal_types:
        if st in ACTIVE_START_TYPES:
            return "active_liquidation"
    return "early_outreach"


def _advance_index(current_idx: int, target_idx: int) -> int:
    """Advance phase forward (never backward)."""
    return max(current_idx, target_idx)


def _compute_confidence(signal_count: int, days_since_latest: int) -> str:
    """Confidence in the prediction based on data freshness + volume."""
    if signal_count >= 3 and days_since_latest <= 14:
        return "high"
    if signal_count >= 2 or days_since_latest <= 30:
        return "medium"
    return "low"


def _build_explanation(
    phase: str,
    signal_types: list[str],
    days_since_latest: int,
    signal_velocity: float,
    employee_count: int | None,
) -> str:
    """Deterministic explanation template based on phase + context."""
    active_types = [st for st in signal_types if st in ACTIVE_START_TYPES]

    if phase == "active_liquidation":
        if active_types:
            type_label = active_types[0].replace("_", " ")
            return f"Active liquidation phase — {type_label} detected, assets are or will soon be in play."
        if signal_velocity >= 3.0:
            return "Accelerating signal velocity pushed this deal into active liquidation phase."
        return "Time decay and signal patterns indicate assets are entering the disposition window."

    if phase == "early_outreach":
        if employee_count and employee_count >= 5000:
            return "Large organization in early distress — extended timeline gives you a head start."
        return "Distress signals detected but assets are not yet moving — build relationships early."

    # late_stage
    if days_since_latest > 90:
        return f"Last signal was {days_since_latest} days ago — most value may already be claimed."
    return "Deal is aging out of the active window — move fast or consider passing."


def predict_phase(
    signal_types: list[str],
    days_since_latest: int,
    signal_velocity: float,
    employee_count: int | None,
    disposition_window: str,
    risk_trend: str,
    signal_count: int,
) -> TimingPrediction:
    """Predict the current disposition lifecycle phase for an opportunity.

    3-step rule engine:
      1. Initial phase from signal type urgency
      2. Time-based decay (with size multiplier)
      3. Velocity acceleration
    """
    # Step 1: initial phase from signal types
    phase = _initial_phase(signal_types)
    phase_idx = _PHASE_ORDER.index(phase)

    # Step 2: time-based decay
    mult = _size_multiplier(employee_count)

    if phase == "early_outreach":
        if days_since_latest >= 90 * mult:
            phase_idx = _advance_index(phase_idx, 2)  # late_stage
        elif days_since_latest >= 30 * mult:
            phase_idx = _advance_index(phase_idx, 1)  # active_liquidation

    if phase == "active_liquidation" or _PHASE_ORDER[phase_idx] == "active_liquidation":
        if days_since_latest >= 45 * mult:
            phase_idx = _advance_index(phase_idx, 2)  # late_stage

    # Step 3: velocity acceleration (only promotes Early → Active)
    if phase_idx == 0:  # still early_outreach
        if signal_velocity >= 3.0 and signal_count >= 3:
            phase_idx = 1
        elif signal_velocity >= 2.0 and risk_trend == "rising":
            phase_idx = 1

    # Build result
    final_phase = _PHASE_ORDER[phase_idx]
    meta = _PHASE_META[final_phase]
    confidence = _compute_confidence(signal_count, days_since_latest)
    explanation = _build_explanation(
        final_phase, signal_types, days_since_latest, signal_velocity, employee_count,
    )

    return TimingPrediction(
        phase=final_phase,
        phase_label=meta["label"],
        verb=meta["verb"],
        explanation=explanation,
        confidence=confidence,
    )
