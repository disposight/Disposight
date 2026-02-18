"""Opportunity Gap Detection — find high-value unwatched deals matching tenant patterns.

Pure-function module (no DB, no async). Analyzes a tenant's watchlist to infer
geographic, industry, and signal-type preferences, then scores unwatched
opportunities against that profile.

Scoring budget (sums to 100):
    State match       30 pts
    Industry match    25 pts
    Signal type match 20 pts
    High deal score   15 pts  (>=70)
    Freshness         10 pts  (<48h)
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

MIN_COUNT = 2
MAX_PROFILE_ITEMS = 10


@dataclass(frozen=True, slots=True)
class TenantProfile:
    states: list[str] = field(default_factory=list)
    industries: list[str] = field(default_factory=list)
    signal_types: list[str] = field(default_factory=list)
    min_deal_score: int = 0


@dataclass(frozen=True, slots=True)
class GapMatch:
    gap_score: int = 0
    match_reasons: list[str] = field(default_factory=list)
    is_new: bool = False


# ---------------------------------------------------------------------------
# Profile derivation
# ---------------------------------------------------------------------------


def derive_profile_from_watchlist(
    watched_companies: list[dict],
    watched_signal_types: list[str],
) -> TenantProfile:
    """Infer a TenantProfile from the tenant's watchlist behaviour.

    Args:
        watched_companies: list of dicts with "headquarters_state" and "industry" keys.
        watched_signal_types: flat list of signal type strings across all watched companies.

    Returns:
        TenantProfile with states/industries/signal_types that appear >= MIN_COUNT times.
    """
    if not watched_companies:
        return TenantProfile()

    state_counts = Counter(
        c["headquarters_state"]
        for c in watched_companies
        if c.get("headquarters_state")
    )
    industry_counts = Counter(
        c["industry"] for c in watched_companies if c.get("industry")
    )
    type_counts = Counter(watched_signal_types)

    states = [
        s
        for s, count in state_counts.most_common(MAX_PROFILE_ITEMS)
        if count >= MIN_COUNT
    ]
    industries = [
        i
        for i, count in industry_counts.most_common(MAX_PROFILE_ITEMS)
        if count >= MIN_COUNT
    ]
    signal_types = [
        t
        for t, count in type_counts.most_common(MAX_PROFILE_ITEMS)
        if count >= MIN_COUNT
    ]

    return TenantProfile(
        states=states, industries=industries, signal_types=signal_types
    )


# ---------------------------------------------------------------------------
# Preference merging
# ---------------------------------------------------------------------------


def merge_with_explicit_prefs(
    inferred: TenantProfile,
    explicit_dict: dict | None,
) -> TenantProfile:
    """Merge inferred profile with explicit user preferences.

    Explicit fields override inferred when present and non-empty.
    """
    if explicit_dict is None:
        return inferred

    return TenantProfile(
        states=explicit_dict.get("states") or inferred.states,
        industries=explicit_dict.get("industries") or inferred.industries,
        signal_types=explicit_dict.get("signal_types") or inferred.signal_types,
        min_deal_score=explicit_dict.get("min_deal_score", inferred.min_deal_score),
    )


# ---------------------------------------------------------------------------
# Gap scoring
# ---------------------------------------------------------------------------


def score_gap_relevance(
    opp_state: str | None,
    opp_industry: str | None,
    opp_signal_types: list[str],
    opp_deal_score: int,
    age_hours: float,
    profile: TenantProfile,
) -> tuple[int, list[str]]:
    """Score how relevant an unwatched opportunity is to the tenant's profile.

    Returns (score 0-100, list of human-readable match reasons).
    """
    score = 0
    reasons: list[str] = []

    # State match: +30
    if opp_state and profile.states:
        upper_states = {s.upper() for s in profile.states}
        if opp_state.upper() in upper_states:
            score += 30
            reasons.append(f"In your coverage area ({opp_state})")

    # Industry match: +25 (case-insensitive substring)
    if opp_industry and profile.industries:
        opp_ind_lower = opp_industry.lower()
        for pi in profile.industries:
            if pi.lower() in opp_ind_lower or opp_ind_lower in pi.lower():
                score += 25
                reasons.append(f"Matches your industry focus ({opp_industry})")
                break

    # Signal type overlap: +20
    if opp_signal_types and profile.signal_types:
        overlap = set(opp_signal_types) & set(profile.signal_types)
        if overlap:
            score += 20
            matched = sorted(overlap)[0]
            reasons.append(f"Signal type you track ({matched})")

    # High deal score (>=70): +15
    if opp_deal_score >= 70:
        score += 15
        reasons.append(f"High-priority deal (score {opp_deal_score})")

    # Freshness (<48h): +10
    if age_hours < 48:
        score += 10
        reasons.append("New signal detected")

    return min(score, 100), reasons


# ---------------------------------------------------------------------------
# Gap detection
# ---------------------------------------------------------------------------


def detect_gaps(
    all_opportunities: list[Any],
    watched_company_ids: set,
    profile: TenantProfile,
    limit: int = 5,
    now: datetime | None = None,
) -> tuple[list[tuple[Any, GapMatch]], int]:
    """Find top unwatched opportunities matching the tenant's profile.

    Args:
        all_opportunities: objects with company_id, headquarters_state, industry,
                          signal_types, deal_score, latest_signal_at attributes.
        watched_company_ids: set of company IDs already on the tenant's watchlist.
        profile: merged TenantProfile (inferred + explicit).
        limit: max results to return.
        now: current time (for testability).

    Returns:
        (list of (opportunity, GapMatch) pairs, total_uncovered_count).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    unwatched = [
        o for o in all_opportunities if o.company_id not in watched_company_ids
    ]

    has_profile = bool(profile.states or profile.industries or profile.signal_types)

    scored: list[tuple[Any, int, list[str], bool]] = []
    for opp in unwatched:
        if profile.min_deal_score and opp.deal_score < profile.min_deal_score:
            continue

        latest = opp.latest_signal_at
        if isinstance(latest, str):
            latest = datetime.fromisoformat(latest)
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        age_hours = max(0, (now - latest).total_seconds() / 3600)

        if has_profile:
            gap_score, reasons = score_gap_relevance(
                opp_state=opp.headquarters_state,
                opp_industry=opp.industry,
                opp_signal_types=opp.signal_types,
                opp_deal_score=opp.deal_score,
                age_hours=age_hours,
                profile=profile,
            )
        else:
            gap_score = opp.deal_score
            reasons = ["Top deal by overall score"]

        is_new = age_hours < 48
        scored.append((opp, gap_score, reasons, is_new))

    # Sort by gap_score DESC, deal_score as tiebreaker
    scored.sort(key=lambda x: (x[1], x[0].deal_score), reverse=True)

    total_uncovered = len(scored)

    result = [
        (opp, GapMatch(gap_score=gs, match_reasons=reasons, is_new=is_new))
        for opp, gs, reasons, is_new in scored[:limit]
    ]

    return result, total_uncovered
