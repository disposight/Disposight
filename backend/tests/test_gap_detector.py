"""Tests for opportunity gap detection engine."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.processing.gap_detector import (
    GapMatch,
    TenantProfile,
    derive_profile_from_watchlist,
    detect_gaps,
    merge_with_explicit_prefs,
    score_gap_relevance,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_opp(
    company_id="c1",
    headquarters_state="CA",
    industry="Technology",
    signal_types=None,
    deal_score=75,
    latest_signal_at=None,
):
    if signal_types is None:
        signal_types = ["layoff"]
    if latest_signal_at is None:
        latest_signal_at = datetime.now(timezone.utc)
    return SimpleNamespace(
        company_id=company_id,
        headquarters_state=headquarters_state,
        industry=industry,
        signal_types=signal_types,
        deal_score=deal_score,
        latest_signal_at=latest_signal_at,
    )


# ---------------------------------------------------------------------------
# Profile derivation
# ---------------------------------------------------------------------------

class TestDeriveProfile:
    def test_empty_watchlist(self):
        profile = derive_profile_from_watchlist([], [])
        assert profile.states == []
        assert profile.industries == []
        assert profile.signal_types == []

    def test_extracts_states(self):
        companies = [
            {"headquarters_state": "CA", "industry": "Tech"},
            {"headquarters_state": "CA", "industry": "Tech"},
            {"headquarters_state": "TX", "industry": "Retail"},
            {"headquarters_state": "TX", "industry": "Retail"},
        ]
        profile = derive_profile_from_watchlist(companies, [])
        assert "CA" in profile.states
        assert "TX" in profile.states

    def test_extracts_industries(self):
        companies = [
            {"headquarters_state": "CA", "industry": "Technology"},
            {"headquarters_state": "NY", "industry": "Technology"},
            {"headquarters_state": "TX", "industry": "Retail"},
            {"headquarters_state": "FL", "industry": "Retail"},
        ]
        profile = derive_profile_from_watchlist(companies, [])
        assert "Technology" in profile.industries
        assert "Retail" in profile.industries

    def test_extracts_signal_types(self):
        companies = [{"headquarters_state": "CA", "industry": "Tech"}]
        types = ["layoff", "layoff", "bankruptcy_ch7", "bankruptcy_ch7"]
        profile = derive_profile_from_watchlist(companies, types)
        assert "layoff" in profile.signal_types
        assert "bankruptcy_ch7" in profile.signal_types

    def test_minimum_count_threshold(self):
        """Items appearing only once should be excluded."""
        companies = [
            {"headquarters_state": "CA", "industry": "Technology"},
            {"headquarters_state": "CA", "industry": "Technology"},
            {"headquarters_state": "TX", "industry": "Retail"},
            # TX appears only once, Retail appears only once
        ]
        profile = derive_profile_from_watchlist(companies, ["layoff"])
        assert "CA" in profile.states
        assert "TX" not in profile.states
        assert "Technology" in profile.industries
        assert "Retail" not in profile.industries
        assert "layoff" not in profile.signal_types  # only 1 occurrence


# ---------------------------------------------------------------------------
# Merging
# ---------------------------------------------------------------------------

class TestMerge:
    def test_explicit_overrides_inferred(self):
        inferred = TenantProfile(states=["CA"], industries=["Tech"], signal_types=["layoff"])
        explicit = {"states": ["NY", "TX"], "industries": ["Retail"], "signal_types": ["merger"]}
        merged = merge_with_explicit_prefs(inferred, explicit)
        assert merged.states == ["NY", "TX"]
        assert merged.industries == ["Retail"]
        assert merged.signal_types == ["merger"]

    def test_empty_explicit_keeps_inferred(self):
        inferred = TenantProfile(states=["CA"], industries=["Tech"])
        explicit = {"states": [], "industries": []}
        merged = merge_with_explicit_prefs(inferred, explicit)
        assert merged.states == ["CA"]
        assert merged.industries == ["Tech"]

    def test_none_returns_inferred(self):
        inferred = TenantProfile(states=["CA"])
        merged = merge_with_explicit_prefs(inferred, None)
        assert merged is inferred

    def test_min_deal_score_applied(self):
        inferred = TenantProfile(min_deal_score=0)
        explicit = {"min_deal_score": 70}
        merged = merge_with_explicit_prefs(inferred, explicit)
        assert merged.min_deal_score == 70


# ---------------------------------------------------------------------------
# Gap scoring
# ---------------------------------------------------------------------------

class TestScoring:
    def test_state_match_30pts(self):
        profile = TenantProfile(states=["CA"])
        score, reasons = score_gap_relevance("CA", None, [], 50, 100, profile)
        assert score == 30
        assert any("coverage area" in r for r in reasons)

    def test_industry_match_25pts(self):
        profile = TenantProfile(industries=["Technology"])
        score, reasons = score_gap_relevance(None, "Technology", [], 50, 100, profile)
        assert score == 25
        assert any("industry focus" in r for r in reasons)

    def test_signal_type_match_20pts(self):
        profile = TenantProfile(signal_types=["layoff"])
        score, reasons = score_gap_relevance(None, None, ["layoff"], 50, 100, profile)
        assert score == 20
        assert any("Signal type" in r for r in reasons)

    def test_high_deal_score_15pts(self):
        profile = TenantProfile()
        score, reasons = score_gap_relevance(None, None, [], 70, 100, profile)
        assert score == 15
        assert any("High-priority" in r for r in reasons)

    def test_freshness_10pts(self):
        profile = TenantProfile()
        score, reasons = score_gap_relevance(None, None, [], 50, 24, profile)
        assert score == 10
        assert any("New signal" in r for r in reasons)

    def test_perfect_score_100(self):
        profile = TenantProfile(
            states=["CA"],
            industries=["Technology"],
            signal_types=["layoff"],
        )
        score, reasons = score_gap_relevance("CA", "Technology", ["layoff"], 85, 12, profile)
        assert score == 100
        assert len(reasons) == 5


# ---------------------------------------------------------------------------
# Gap detection
# ---------------------------------------------------------------------------

class TestDetectGaps:
    def test_excludes_watched(self):
        now = datetime.now(timezone.utc)
        opps = [
            _make_opp(company_id="c1", latest_signal_at=now),
            _make_opp(company_id="c2", latest_signal_at=now),
        ]
        profile = TenantProfile(states=["CA"])
        results, total = detect_gaps(opps, {"c1"}, profile, limit=10, now=now)
        ids = [r[0].company_id for r in results]
        assert "c1" not in ids
        assert "c2" in ids

    def test_respects_limit(self):
        now = datetime.now(timezone.utc)
        opps = [_make_opp(company_id=f"c{i}", latest_signal_at=now) for i in range(10)]
        profile = TenantProfile(states=["CA"])
        results, total = detect_gaps(opps, set(), profile, limit=3, now=now)
        assert len(results) == 3
        assert total == 10

    def test_sorts_by_gap_score_desc(self):
        now = datetime.now(timezone.utc)
        opps = [
            _make_opp(company_id="low", headquarters_state="FL", industry="Other", signal_types=["merger"], deal_score=40, latest_signal_at=now - timedelta(days=5)),
            _make_opp(company_id="high", headquarters_state="CA", industry="Technology", signal_types=["layoff"], deal_score=90, latest_signal_at=now - timedelta(hours=12)),
        ]
        profile = TenantProfile(states=["CA"], industries=["Technology"], signal_types=["layoff"])
        results, _ = detect_gaps(opps, set(), profile, limit=10, now=now)
        assert results[0][0].company_id == "high"
        assert results[0][1].gap_score > results[1][1].gap_score

    def test_empty_watchlist_fallback(self):
        now = datetime.now(timezone.utc)
        opps = [
            _make_opp(company_id="c1", deal_score=90, latest_signal_at=now),
            _make_opp(company_id="c2", deal_score=50, latest_signal_at=now),
        ]
        profile = TenantProfile()  # empty profile
        results, _ = detect_gaps(opps, set(), profile, limit=10, now=now)
        # Should return top deals by deal_score with fallback reason
        assert results[0][0].company_id == "c1"
        assert any("Top deal by overall score" in r for r in results[0][1].match_reasons)

    def test_min_deal_score_filter(self):
        now = datetime.now(timezone.utc)
        opps = [
            _make_opp(company_id="c1", deal_score=80, latest_signal_at=now),
            _make_opp(company_id="c2", deal_score=40, latest_signal_at=now),
        ]
        profile = TenantProfile(states=["CA"], min_deal_score=60)
        results, total = detect_gaps(opps, set(), profile, limit=10, now=now)
        ids = [r[0].company_id for r in results]
        assert "c1" in ids
        assert "c2" not in ids
        assert total == 1
