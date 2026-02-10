"""Central plan limits configuration.

All tier-specific feature gates and numeric caps live here.
No scattered magic numbers — change limits in one place.
"""

from dataclasses import dataclass, field

from fastapi import HTTPException


@dataclass(frozen=True)
class PlanLimits:
    max_watchlist_companies: int
    max_active_alerts: int
    max_signal_analyses_per_day: int | None  # None = unlimited
    allowed_alert_frequencies: list[str] = field(default_factory=list)
    signal_history_days: int | None = None  # None = full history
    score_breakdown_mode: str = "compact"  # "compact" (top 3) or "full" (all 8)
    csv_export: bool = False
    team_pipeline: bool = False


PLAN_LIMITS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        max_watchlist_companies=5,
        max_active_alerts=1,
        max_signal_analyses_per_day=1,
        allowed_alert_frequencies=["daily"],
        signal_history_days=7,
        score_breakdown_mode="compact",
        csv_export=False,
        team_pipeline=False,
    ),
    "trialing": PlanLimits(
        max_watchlist_companies=50,
        max_active_alerts=3,
        max_signal_analyses_per_day=5,
        allowed_alert_frequencies=["daily"],
        signal_history_days=30,
        score_breakdown_mode="compact",
        csv_export=False,
        team_pipeline=False,
    ),
    "starter": PlanLimits(
        max_watchlist_companies=50,
        max_active_alerts=3,
        max_signal_analyses_per_day=5,
        allowed_alert_frequencies=["daily"],
        signal_history_days=30,
        score_breakdown_mode="compact",
        csv_export=False,
        team_pipeline=False,
    ),
    "pro": PlanLimits(
        max_watchlist_companies=200,
        max_active_alerts=999,  # effectively unlimited
        max_signal_analyses_per_day=None,
        allowed_alert_frequencies=["realtime", "daily", "weekly"],
        signal_history_days=None,
        score_breakdown_mode="full",
        csv_export=True,
        team_pipeline=True,
    ),
}


def get_plan_limits(plan: str | None) -> PlanLimits:
    """Return limits for the given plan, defaulting to free."""
    return PLAN_LIMITS.get(plan or "free", PLAN_LIMITS["free"])


def raise_plan_limit(feature: str, current_plan: str, detail: str) -> None:
    """Raise HTTP 402 with structured JSON body."""
    raise HTTPException(
        status_code=402,
        detail={
            "error": "plan_limit_exceeded",
            "feature": feature,
            "current_plan": current_plan,
            "message": detail,
        },
    )
