"""Tests for the deal scoring engine — 8-factor weighted scoring."""

import math

from app.processing.deal_scorer import (
    DealScoreResult,
    ScoreFactor,
    compute_deal_score,
    get_band,
    URGENCY_MAP,
    SOURCE_TRUST,
    TREND_SCORES,
)


# ---------------------------------------------------------------------------
# Band classification
# ---------------------------------------------------------------------------

def test_band_immediate_pursuit():
    assert get_band(100) == ("immediate_pursuit", "Immediate Pursuit")
    assert get_band(85) == ("immediate_pursuit", "Immediate Pursuit")


def test_band_high_priority():
    assert get_band(84) == ("high_priority", "High Priority")
    assert get_band(70) == ("high_priority", "High Priority")


def test_band_qualified_pipeline():
    assert get_band(69) == ("qualified_pipeline", "Qualified Pipeline")
    assert get_band(55) == ("qualified_pipeline", "Qualified Pipeline")


def test_band_background():
    assert get_band(54) == ("background", "Background")
    assert get_band(0) == ("background", "Background")


# ---------------------------------------------------------------------------
# Score clamping
# ---------------------------------------------------------------------------

def test_score_never_exceeds_100():
    result = compute_deal_score(
        avg_severity=100,
        avg_confidence=100,
        composite_risk_score=100,
        total_devices=50000,
        source_diversity=5,
        signal_types=["bankruptcy_ch7"],
        days_since_latest=0,
        source_names=["warn_act", "courtlistener", "sec_edgar"],
        risk_trend="rising",
        signal_count=10,
    )
    assert result.score <= 100


def test_score_never_below_zero():
    result = compute_deal_score(
        avg_severity=0,
        avg_confidence=0,
        composite_risk_score=0,
        total_devices=0,
        source_diversity=0,
        signal_types=[],
        days_since_latest=365,
        source_names=[],
        risk_trend="declining",
        signal_count=1,
    )
    assert result.score >= 0


# ---------------------------------------------------------------------------
# Result structure
# ---------------------------------------------------------------------------

def test_result_has_8_factors():
    result = compute_deal_score(
        avg_severity=50,
        avg_confidence=70,
        composite_risk_score=60,
        total_devices=500,
        source_diversity=2,
        signal_types=["layoff"],
        days_since_latest=3,
        source_names=["warn_act"],
        risk_trend="stable",
        signal_count=2,
    )
    assert len(result.factors) == 8
    factor_names = {f.name for f in result.factors}
    assert factor_names == {
        "Device Volume", "Urgency", "Recency", "Corroboration",
        "Source Trust", "Confidence", "Company Risk", "Risk Trend",
    }


def test_result_has_top_3_factors():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=60,
        total_devices=500, source_diversity=2, signal_types=["layoff"],
        days_since_latest=3, source_names=["warn_act"], risk_trend="stable",
        signal_count=2,
    )
    assert len(result.top_factors) == 3
    assert all(isinstance(f, str) for f in result.top_factors)


def test_result_band_matches_score():
    result = compute_deal_score(
        avg_severity=90, avg_confidence=90, composite_risk_score=90,
        total_devices=5000, source_diversity=3,
        signal_types=["bankruptcy_ch7"],
        days_since_latest=0, source_names=["courtlistener", "warn_act", "gdelt"],
        risk_trend="rising", signal_count=5,
    )
    expected_band, expected_label = get_band(result.score)
    assert result.band == expected_band
    assert result.band_label == expected_label


# ---------------------------------------------------------------------------
# Factor scoring behavior
# ---------------------------------------------------------------------------

def test_higher_devices_score_higher():
    base = dict(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        source_diversity=1, signal_types=["layoff"], days_since_latest=5,
        source_names=["gdelt"], risk_trend="stable", signal_count=2,
    )
    small = compute_deal_score(total_devices=100, **base)
    large = compute_deal_score(total_devices=5000, **base)
    assert large.score > small.score


def test_ch7_scores_higher_than_merger():
    base = dict(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, days_since_latest=5,
        source_names=["gdelt"], risk_trend="stable", signal_count=2,
    )
    ch7 = compute_deal_score(signal_types=["bankruptcy_ch7"], **base)
    merger = compute_deal_score(signal_types=["merger"], **base)
    assert ch7.score > merger.score


def test_recent_scores_higher_than_old():
    base = dict(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        source_names=["gdelt"], risk_trend="stable", signal_count=2,
    )
    recent = compute_deal_score(days_since_latest=0, **base)
    old = compute_deal_score(days_since_latest=30, **base)
    assert recent.score > old.score


def test_multi_source_scores_higher():
    base = dict(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, signal_types=["layoff"], days_since_latest=5,
        risk_trend="stable", signal_count=3,
    )
    single = compute_deal_score(source_diversity=1, source_names=["gdelt"], **base)
    multi = compute_deal_score(source_diversity=3, source_names=["warn_act", "gdelt", "courtlistener"], **base)
    assert multi.score > single.score


def test_rising_trend_scores_higher():
    base = dict(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["gdelt"], signal_count=2,
    )
    rising = compute_deal_score(risk_trend="rising", **base)
    declining = compute_deal_score(risk_trend="declining", **base)
    assert rising.score > declining.score


# ---------------------------------------------------------------------------
# Guardrails
# ---------------------------------------------------------------------------

def test_penalty_for_low_confidence_single_source():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=30, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["gdelt"],
        risk_trend="stable", signal_count=1,
    )
    assert result.penalty_applied is True


def test_no_penalty_with_high_trust_source():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=30, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["warn_act"],
        risk_trend="stable", signal_count=1,
    )
    assert result.penalty_applied is False
    assert result.boost_applied is True


def test_boost_for_high_trust_source():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["courtlistener"],
        risk_trend="stable", signal_count=2,
    )
    assert result.boost_applied is True


def test_no_boost_for_news_only():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["gdelt"],
        risk_trend="stable", signal_count=2,
    )
    assert result.boost_applied is False


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_signal_types():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=[],
        days_since_latest=5, source_names=["gdelt"],
        risk_trend="stable", signal_count=1,
    )
    assert result.score >= 0


def test_empty_source_names():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=[],
        risk_trend="stable", signal_count=1,
    )
    assert result.score >= 0


def test_zero_devices():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=0, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["gdelt"],
        risk_trend="stable", signal_count=1,
    )
    assert result.score >= 0


def test_unknown_risk_trend():
    result = compute_deal_score(
        avg_severity=50, avg_confidence=70, composite_risk_score=50,
        total_devices=500, source_diversity=1, signal_types=["layoff"],
        days_since_latest=5, source_names=["gdelt"],
        risk_trend="unknown_value", signal_count=1,
    )
    # Should use default trend score (2.5)
    assert result.score >= 0
