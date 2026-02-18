"""Tests for the predictive disposition timing model."""

from app.processing.timing import TimingPrediction, predict_phase


def _default_kwargs(**overrides):
    """Base kwargs for predict_phase — easy to override per-test."""
    base = dict(
        signal_types=["layoff"],
        days_since_latest=5,
        signal_velocity=1.0,
        employee_count=200,
        disposition_window="1-3 months",
        risk_trend="stable",
        signal_count=2,
    )
    base.update(overrides)
    return base


def test_ch7_starts_active():
    """Bankruptcy ch7 should start directly in active_liquidation."""
    result = predict_phase(**_default_kwargs(signal_types=["bankruptcy_ch7"]))
    assert result.phase == "active_liquidation"
    assert result.phase_label == "Active Liquidation"
    assert result.verb == "Act now"


def test_liquidation_starts_active():
    result = predict_phase(**_default_kwargs(signal_types=["liquidation"]))
    assert result.phase == "active_liquidation"


def test_ceasing_operations_starts_active():
    result = predict_phase(**_default_kwargs(signal_types=["ceasing_operations"]))
    assert result.phase == "active_liquidation"


def test_merger_starts_early():
    """Non-urgent signal types should start in early_outreach."""
    result = predict_phase(**_default_kwargs(signal_types=["merger"]))
    assert result.phase == "early_outreach"
    assert result.phase_label == "Early Outreach"
    assert result.verb == "Reach out early"


def test_layoff_starts_early():
    result = predict_phase(**_default_kwargs(signal_types=["layoff"]))
    assert result.phase == "early_outreach"


def test_old_early_becomes_active():
    """After 30+ days, early_outreach should advance to active_liquidation."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=35,
    ))
    assert result.phase == "active_liquidation"


def test_old_active_becomes_late():
    """After 45+ days, active_liquidation should advance to late_stage."""
    result = predict_phase(**_default_kwargs(
        signal_types=["bankruptcy_ch7"],
        days_since_latest=50,
    ))
    assert result.phase == "late_stage"
    assert result.phase_label == "Late-Stage"
    assert result.verb == "Move fast or pass"


def test_very_old_early_becomes_late():
    """After 90+ days, early_outreach should skip straight to late_stage."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=95,
    ))
    assert result.phase == "late_stage"


def test_large_org_slower_decay():
    """5000+ employees should use 2x multiplier — 30 days stays early."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=35,
        employee_count=6000,
    ))
    # 30 * 2.0 = 60 days threshold, so 35 days is still early
    assert result.phase == "early_outreach"


def test_medium_org_slower_decay():
    """500-5000 employees use 1.5x multiplier."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=35,
        employee_count=2000,
    ))
    # 30 * 1.5 = 45 days threshold, so 35 days is still early
    assert result.phase == "early_outreach"


def test_velocity_acceleration_high():
    """High velocity + enough signals should promote early → active."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=5,
        signal_velocity=3.5,
        signal_count=4,
    ))
    assert result.phase == "active_liquidation"


def test_velocity_acceleration_rising_trend():
    """Moderate velocity + rising trend should promote early → active."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=5,
        signal_velocity=2.5,
        risk_trend="rising",
        signal_count=2,
    ))
    assert result.phase == "active_liquidation"


def test_velocity_no_acceleration_insufficient_signals():
    """High velocity but only 2 signals should NOT accelerate."""
    result = predict_phase(**_default_kwargs(
        signal_types=["merger"],
        days_since_latest=5,
        signal_velocity=3.5,
        signal_count=2,
    ))
    assert result.phase == "early_outreach"


def test_empty_signal_types():
    """Empty signal types should default to early_outreach."""
    result = predict_phase(**_default_kwargs(signal_types=[]))
    assert result.phase == "early_outreach"


def test_explanation_non_empty():
    """Every prediction should have a non-empty explanation."""
    for types in [["bankruptcy_ch7"], ["merger"], ["layoff"]]:
        for days in [5, 50, 100]:
            result = predict_phase(**_default_kwargs(
                signal_types=types,
                days_since_latest=days,
            ))
            assert result.explanation, f"Empty explanation for {types} at {days}d"
            assert len(result.explanation) > 10


def test_all_phases_have_valid_verbs():
    """Each phase must have a non-empty verb."""
    # Force each phase
    early = predict_phase(**_default_kwargs(signal_types=["merger"], days_since_latest=1))
    active = predict_phase(**_default_kwargs(signal_types=["bankruptcy_ch7"], days_since_latest=1))
    late = predict_phase(**_default_kwargs(signal_types=["bankruptcy_ch7"], days_since_latest=50))

    assert early.verb == "Reach out early"
    assert active.verb == "Act now"
    assert late.verb == "Move fast or pass"


def test_confidence_high():
    """3+ signals within 14 days = high confidence."""
    result = predict_phase(**_default_kwargs(signal_count=4, days_since_latest=10))
    assert result.confidence == "high"


def test_confidence_medium():
    """2 signals or <=30 days = medium."""
    result = predict_phase(**_default_kwargs(signal_count=2, days_since_latest=25))
    assert result.confidence == "medium"


def test_confidence_low():
    """1 signal and >30 days = low."""
    result = predict_phase(**_default_kwargs(signal_count=1, days_since_latest=60))
    assert result.confidence == "low"


def test_prediction_is_frozen_dataclass():
    """TimingPrediction should be immutable."""
    result = predict_phase(**_default_kwargs())
    assert isinstance(result, TimingPrediction)
    try:
        result.phase = "late_stage"  # type: ignore[misc]
        assert False, "Should have raised FrozenInstanceError"
    except AttributeError:
        pass
