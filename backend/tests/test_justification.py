"""Tests for the plain-English deal justification engine."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.processing.justification import (
    EVENT_VERBS,
    generate_compact_justification,
    generate_full_justification,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_kwargs(**overrides):
    """Return default kwargs for generate_compact_justification with overrides."""
    defaults = {
        "company_name": "Acme Corp",
        "signal_types": ["layoff"],
        "source_names": ["warn_act"],
        "total_devices": 450,
        "revenue_estimate": 20_250.0,
        "disposition_window": "1-3 months",
        "deal_score": 72,
        "score_band": "high_priority",
        "risk_trend": "stable",
        "source_diversity": 1,
        "days_since_latest": 5,
        "penalty_applied": False,
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# Template generator tests
# ---------------------------------------------------------------------------

def test_basic_layoff():
    """Verify company name, device count, source mentioned, 2-3 sentences."""
    result = generate_compact_justification(**_base_kwargs())
    assert "Acme Corp" in result
    assert "450" in result
    assert "WARN Act filing" in result
    sentences = result.split(". ")
    assert 2 <= len(sentences) <= 4  # 2-3 sentences (split may vary with abbreviations)


def test_multi_source_corroboration():
    """Multi-source should produce corroboration language."""
    result = generate_compact_justification(**_base_kwargs(
        source_names=["warn_act", "gdelt"],
        source_diversity=2,
    ))
    assert "Corroborated by 2 independent sources" in result


def test_ch7_bankruptcy_urgent():
    """Ch. 7 should produce urgent language and 'Immediate' disposition."""
    result = generate_compact_justification(**_base_kwargs(
        signal_types=["bankruptcy_ch7"],
        disposition_window="Immediate",
        deal_score=92,
        score_band="immediate_pursuit",
        source_names=["courtlistener"],
    ))
    assert "Chapter 7 liquidation" in result
    assert "immediate" in result.lower()


def test_rising_risk_trend():
    """Rising risk trend with multi-source should say 'Risk trend rising'."""
    result = generate_compact_justification(**_base_kwargs(
        risk_trend="rising",
        source_diversity=3,
        source_names=["warn_act", "gdelt", "sec_edgar"],
    ))
    assert "Risk trend rising" in result


def test_penalty_scenario():
    """Penalty applied should show cautionary language."""
    result = generate_compact_justification(**_base_kwargs(
        penalty_applied=True,
        source_diversity=1,
        days_since_latest=10,
        score_band="background",
        deal_score=35,
        risk_trend="stable",
    ))
    assert "proceed with caution" in result.lower()


def test_all_signal_types_no_key_error():
    """Every key in EVENT_VERBS should produce valid output with no KeyError."""
    for signal_type in EVENT_VERBS:
        result = generate_compact_justification(**_base_kwargs(
            signal_types=[signal_type],
        ))
        assert len(result) > 20  # Non-trivial output


def test_fresh_signal_time_sensitive():
    """Very fresh signal (<=3 days) should show time-sensitive language."""
    result = generate_compact_justification(**_base_kwargs(
        days_since_latest=1,
        source_diversity=1,
        risk_trend="stable",
        score_band="high_priority",
        penalty_applied=False,
    ))
    assert "time-sensitive" in result.lower()


# ---------------------------------------------------------------------------
# LLM generator tests (mocked)
# ---------------------------------------------------------------------------

def _make_mock_company(metadata=None):
    """Create a mock Company object."""
    company = MagicMock()
    company.metadata_ = metadata or {}
    company.name = "Test Co"
    return company


@pytest.mark.asyncio
async def test_cache_hit():
    """Pre-populated valid cache should return cached text without calling LLM."""
    now = datetime.now(timezone.utc)
    company = _make_mock_company(metadata={
        "deal_justification_cache": {
            "text": "Cached justification text.",
            "generated_at": now.isoformat(),
            "deal_score_at_generation": 75,
        }
    })

    with patch("app.processing.llm_client.llm_client") as mock_llm:
        result, is_new = await generate_full_justification(
            company=company,
            company_name="Test Co",
            signal_types=["layoff"],
            source_names=["warn_act"],
            total_devices=300,
            revenue_estimate=13_500.0,
            disposition_window="1-3 months",
            deal_score=75,
            score_band_label="High Priority",
            risk_trend="stable",
            avg_severity=65.0,
            avg_confidence=80.0,
            signal_count=2,
        )
        assert result == "Cached justification text."
        assert is_new is False
        mock_llm.complete.assert_not_called()


@pytest.mark.asyncio
async def test_cache_miss_expired():
    """25h-old cache should trigger LLM call."""
    old_time = datetime.now(timezone.utc) - timedelta(hours=25)
    company = _make_mock_company(metadata={
        "deal_justification_cache": {
            "text": "Old cached text.",
            "generated_at": old_time.isoformat(),
            "deal_score_at_generation": 75,
        }
    })

    with patch("app.processing.llm_client.llm_client") as mock_llm:
        mock_llm.complete = AsyncMock(return_value="Fresh LLM justification.")
        result, is_new = await generate_full_justification(
            company=company,
            company_name="Test Co",
            signal_types=["layoff"],
            source_names=["warn_act"],
            total_devices=300,
            revenue_estimate=13_500.0,
            disposition_window="1-3 months",
            deal_score=75,
            score_band_label="High Priority",
            risk_trend="stable",
            avg_severity=65.0,
            avg_confidence=80.0,
            signal_count=2,
        )
        assert result == "Fresh LLM justification."
        assert is_new is True
        mock_llm.complete.assert_called_once()


@pytest.mark.asyncio
async def test_score_drift_invalidation():
    """Cache with score drift >5 should trigger LLM call."""
    now = datetime.now(timezone.utc)
    company = _make_mock_company(metadata={
        "deal_justification_cache": {
            "text": "Stale cached text.",
            "generated_at": now.isoformat(),
            "deal_score_at_generation": 60,  # drift = 20
        }
    })

    with patch("app.processing.llm_client.llm_client") as mock_llm:
        mock_llm.complete = AsyncMock(return_value="Updated justification.")
        result, is_new = await generate_full_justification(
            company=company,
            company_name="Test Co",
            signal_types=["layoff"],
            source_names=["warn_act"],
            total_devices=300,
            revenue_estimate=13_500.0,
            disposition_window="1-3 months",
            deal_score=80,  # drift = 20 from cached 60
            score_band_label="High Priority",
            risk_trend="stable",
            avg_severity=65.0,
            avg_confidence=80.0,
            signal_count=2,
        )
        assert result == "Updated justification."
        assert is_new is True
        mock_llm.complete.assert_called_once()


@pytest.mark.asyncio
async def test_llm_failure_graceful():
    """LLM failure should return (None, False) without raising."""
    company = _make_mock_company()

    with patch("app.processing.llm_client.llm_client") as mock_llm:
        mock_llm.complete = AsyncMock(side_effect=RuntimeError("API down"))
        result, is_new = await generate_full_justification(
            company=company,
            company_name="Test Co",
            signal_types=["layoff"],
            source_names=["warn_act"],
            total_devices=300,
            revenue_estimate=13_500.0,
            disposition_window="1-3 months",
            deal_score=75,
            score_band_label="High Priority",
            risk_trend="stable",
            avg_severity=65.0,
            avg_confidence=80.0,
            signal_count=2,
        )
        assert result is None
        assert is_new is False
