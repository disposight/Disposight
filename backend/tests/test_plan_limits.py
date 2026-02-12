"""Tests for plan limits and tier gating."""

import pytest
from fastapi import HTTPException

from app.plan_limits import PlanLimits, get_plan_limits, raise_plan_limit, PLAN_LIMITS


# ---------------------------------------------------------------------------
# All plans are defined
# ---------------------------------------------------------------------------

def test_all_plans_exist():
    assert "free" in PLAN_LIMITS
    assert "trialing" in PLAN_LIMITS
    assert "starter" in PLAN_LIMITS
    assert "pro" in PLAN_LIMITS


# ---------------------------------------------------------------------------
# get_plan_limits
# ---------------------------------------------------------------------------

def test_get_free_plan():
    limits = get_plan_limits("free")
    assert limits.max_watchlist_companies == 5
    assert limits.max_active_alerts == 1
    assert limits.signal_history_days == 7
    assert limits.csv_export is False
    assert limits.team_pipeline is False


def test_get_trialing_plan():
    limits = get_plan_limits("trialing")
    assert limits.max_watchlist_companies == 50
    assert limits.max_active_alerts == 3
    assert limits.signal_history_days == 30


def test_get_starter_plan():
    limits = get_plan_limits("starter")
    assert limits.max_watchlist_companies == 200
    assert limits.max_signal_analyses_per_day is None  # unlimited
    assert limits.csv_export is True
    assert limits.team_pipeline is False
    assert limits.score_breakdown_mode == "full"
    assert "realtime" in limits.allowed_alert_frequencies


def test_get_pro_plan():
    limits = get_plan_limits("pro")
    assert limits.max_watchlist_companies == 200
    assert limits.max_signal_analyses_per_day is None  # unlimited
    assert limits.signal_history_days is None  # full history
    assert limits.csv_export is True
    assert limits.team_pipeline is True
    assert limits.score_breakdown_mode == "full"
    assert "realtime" in limits.allowed_alert_frequencies


def test_unknown_plan_defaults_to_free():
    limits = get_plan_limits("nonexistent")
    assert limits == PLAN_LIMITS["free"]


def test_none_plan_defaults_to_free():
    limits = get_plan_limits(None)
    assert limits == PLAN_LIMITS["free"]


# ---------------------------------------------------------------------------
# Plan hierarchy
# ---------------------------------------------------------------------------

def test_pro_has_team_pipeline_unlike_starter():
    starter = get_plan_limits("starter")
    pro = get_plan_limits("pro")
    assert pro.team_pipeline is True
    assert starter.team_pipeline is False


def test_starter_has_more_watchlist_than_free():
    free = get_plan_limits("free")
    starter = get_plan_limits("starter")
    assert starter.max_watchlist_companies > free.max_watchlist_companies


def test_starter_and_pro_share_alert_frequencies():
    starter = get_plan_limits("starter")
    pro = get_plan_limits("pro")
    assert starter.allowed_alert_frequencies == pro.allowed_alert_frequencies


# ---------------------------------------------------------------------------
# raise_plan_limit
# ---------------------------------------------------------------------------

def test_raise_plan_limit_raises_402():
    with pytest.raises(HTTPException) as exc_info:
        raise_plan_limit("csv_export", "starter", "CSV export requires Pro plan.")
    assert exc_info.value.status_code == 402


def test_raise_plan_limit_structured_body():
    with pytest.raises(HTTPException) as exc_info:
        raise_plan_limit("csv_export", "starter", "CSV export requires Pro plan.")
    detail = exc_info.value.detail
    assert detail["error"] == "plan_limit_exceeded"
    assert detail["feature"] == "csv_export"
    assert detail["current_plan"] == "starter"
    assert "CSV" in detail["message"]


# ---------------------------------------------------------------------------
# Frozen dataclass
# ---------------------------------------------------------------------------

def test_plan_limits_immutable():
    limits = get_plan_limits("pro")
    with pytest.raises(AttributeError):
        limits.max_watchlist_companies = 999
