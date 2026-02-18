import csv
import io
from datetime import datetime, timedelta, timezone
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import aliased

from app.api.v1.deps import CurrentUserId, DbSession, TenantId, TenantPlan
from app.models import Company, Contact, Signal, Watchlist
from app.plan_limits import raise_plan_limit
from app.processing.deal_scorer import DealScoreResult, compute_deal_score
from app.processing.disposition import get_disposition_window
from app.processing.justification import generate_compact_justification, generate_full_justification
from app.processing.timing import predict_phase
from app.rate_limit import limiter
from app.processing.gap_detector import (
    derive_profile_from_watchlist,
    detect_gaps,
    merge_with_explicit_prefs,
)
from app.schemas.opportunity import (
    CommandCenterStats,
    GapDetectionResponse,
    GapOpportunityOut,
    OpportunityDetailOut,
    OpportunityListResponse,
    OpportunityOut,
    RecentChange,
    ScoreBreakdownOut,
    ScoreFactorOut,
    TenantProfileSummary,
)
from app.schemas.signal import SignalOut

logger = structlog.get_logger()

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

DEFAULT_PRICE_PER_DEVICE = 45.0


async def _get_price_per_device(db: DbSession, tenant_id: UUID) -> float:
    from app.models import Tenant

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        return DEFAULT_PRICE_PER_DEVICE
    return (tenant.settings or {}).get("price_per_device", DEFAULT_PRICE_PER_DEVICE)


def _result_to_breakdown(result: DealScoreResult) -> ScoreBreakdownOut:
    """Convert a DealScoreResult to a ScoreBreakdownOut schema."""
    return ScoreBreakdownOut(
        factors=[
            ScoreFactorOut(
                name=f.name,
                points=f.points,
                max_points=f.max_points,
                summary=f.summary,
            )
            for f in result.factors
        ],
        top_factors=result.top_factors,
        band=result.band,
        band_label=result.band_label,
        penalty_applied=result.penalty_applied,
        boost_applied=result.boost_applied,
    )


async def _build_opportunities(
    db: DbSession,
    tenant_id: UUID,
    price_per_device: float,
    *,
    min_deal_score: int | None = None,
    min_devices: int | None = None,
    signal_type: str | None = None,
    state: str | None = None,
    industry: str | None = None,
    watchlist_only: bool = False,
    sort_by: str = "deal_score",
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[OpportunityOut], int, float, int]:
    """Build opportunity list from companies + signals."""
    now = datetime.now(timezone.utc)

    # Base query: companies with at least one signal, excluding unresolved names
    base_filter = Signal.device_estimate.isnot(None) & (Company.normalized_name != "unknown")

    if signal_type:
        base_filter = base_filter & (Signal.signal_type == signal_type)
    if state:
        base_filter = base_filter & (Company.headquarters_state == state.upper())
    if industry:
        base_filter = base_filter & (Company.industry.ilike(f"%{industry}%"))

    # Aggregate signals per company
    agg_query = (
        select(
            Company.id.label("company_id"),
            Company.name.label("company_name"),
            Company.ticker,
            Company.industry,
            Company.headquarters_state,
            Company.employee_count,
            Company.composite_risk_score,
            Company.risk_trend,
            func.count(Signal.id).label("signal_count"),
            func.coalesce(func.sum(Signal.device_estimate), 0).label("total_device_estimate"),
            func.max(Signal.created_at).label("latest_signal_at"),
            func.min(Signal.created_at).label("earliest_signal_at"),
            func.avg(Signal.confidence_score).label("avg_confidence"),
            func.avg(Signal.severity_score).label("avg_severity"),
            func.count(distinct(Signal.source_name)).label("source_diversity"),
            func.array_agg(distinct(Signal.signal_type)).label("signal_types"),
            func.array_agg(distinct(Signal.source_name)).label("source_names"),
        )
        .join(Signal, Signal.company_id == Company.id)
        .where(base_filter)
        .group_by(Company.id)
        .having(func.count(Signal.id) > 0)
    )

    if min_devices:
        agg_query = agg_query.having(func.sum(Signal.device_estimate) >= min_devices)

    if watchlist_only:
        agg_query = agg_query.join(
            Watchlist,
            (Watchlist.company_id == Company.id) & (Watchlist.tenant_id == tenant_id),
        )

    result = await db.execute(agg_query)
    rows = result.all()

    # Get watchlisted company IDs for this tenant
    wl_result = await db.execute(
        select(Watchlist.company_id).where(Watchlist.tenant_id == tenant_id)
    )
    watched_ids = {r[0] for r in wl_result.all()}

    # Batch-query contact counts for all companies in results
    company_ids = [row.company_id for row in rows]
    contact_count_map: dict = {}
    if company_ids:
        cc_result = await db.execute(
            select(Contact.company_id, func.count(Contact.id))
            .where(Contact.company_id.in_(company_ids))
            .group_by(Contact.company_id)
        )
        contact_count_map = dict(cc_result.all())

    # Compute deal scores and build opportunity objects
    opportunities: list[OpportunityOut] = []
    for row in rows:
        days_since = (now - row.latest_signal_at.replace(tzinfo=timezone.utc)).days if row.latest_signal_at else 999
        signal_types_list = list(row.signal_types) if row.signal_types else []
        source_names_list = list(row.source_names) if row.source_names else []

        deal_result = compute_deal_score(
            avg_severity=float(row.avg_severity or 0),
            avg_confidence=float(row.avg_confidence or 0),
            composite_risk_score=row.composite_risk_score or 0,
            total_devices=int(row.total_device_estimate or 0),
            source_diversity=int(row.source_diversity or 1),
            signal_types=signal_types_list,
            days_since_latest=days_since,
            source_names=source_names_list,
            risk_trend=row.risk_trend or "stable",
            signal_count=row.signal_count,
        )

        if min_deal_score and deal_result.score < min_deal_score:
            continue

        total_devices = int(row.total_device_estimate or 0)
        revenue = total_devices * price_per_device
        disposition = get_disposition_window(signal_types_list)

        justification = generate_compact_justification(
            company_name=row.company_name,
            signal_types=signal_types_list,
            source_names=source_names_list,
            total_devices=total_devices,
            revenue_estimate=revenue,
            disposition_window=disposition,
            deal_score=deal_result.score,
            score_band=deal_result.band,
            risk_trend=row.risk_trend or "stable",
            source_diversity=int(row.source_diversity or 1),
            days_since_latest=days_since,
            penalty_applied=deal_result.penalty_applied,
        )

        days_span_approx = (now - row.earliest_signal_at.replace(tzinfo=timezone.utc)).days if row.earliest_signal_at else 0
        velocity_approx = round(row.signal_count / max(1, days_span_approx) * 30, 1) if days_span_approx > 0 else 0.0

        timing = predict_phase(
            signal_types=signal_types_list,
            days_since_latest=days_since,
            signal_velocity=velocity_approx,
            employee_count=row.employee_count,
            disposition_window=disposition,
            risk_trend=row.risk_trend or "stable",
            signal_count=row.signal_count,
        )

        opportunities.append(
            OpportunityOut(
                company_id=row.company_id,
                company_name=row.company_name,
                ticker=row.ticker,
                industry=row.industry,
                headquarters_state=row.headquarters_state,
                employee_count=row.employee_count,
                composite_risk_score=row.composite_risk_score or 0,
                risk_trend=row.risk_trend or "stable",
                deal_score=deal_result.score,
                score_band=deal_result.band,
                score_band_label=deal_result.band_label,
                signal_count=row.signal_count,
                total_device_estimate=total_devices,
                revenue_estimate=revenue,
                latest_signal_at=row.latest_signal_at,
                disposition_window=disposition,
                signal_types=signal_types_list,
                source_names=source_names_list,
                source_diversity=int(row.source_diversity or 1),
                is_watched=row.company_id in watched_ids,
                top_factors=deal_result.top_factors,
                has_contacts=contact_count_map.get(row.company_id, 0) > 0,
                contact_count=contact_count_map.get(row.company_id, 0),
                justification=justification,
                predicted_phase=timing.phase,
                predicted_phase_label=timing.phase_label,
                phase_verb=timing.verb,
            )
        )

    # Sort
    sort_key_map = {
        "deal_score": lambda o: o.deal_score,
        "revenue": lambda o: o.revenue_estimate,
        "devices": lambda o: o.total_device_estimate,
        "recency": lambda o: o.latest_signal_at,
    }
    key_fn = sort_key_map.get(sort_by, sort_key_map["deal_score"])
    opportunities.sort(key=key_fn, reverse=True)

    total = len(opportunities)
    total_pipeline_value = sum(o.revenue_estimate for o in opportunities)
    total_devices = sum(o.total_device_estimate for o in opportunities)

    # Paginate
    start = (page - 1) * per_page
    paginated = opportunities[start : start + per_page]

    return paginated, total, total_pipeline_value, total_devices


def _log_distress_pattern(
    company: Company,
    deal_result: DealScoreResult,
    signals: list,
    signal_velocity: float,
    days_span: int,
) -> None:
    """Log distress pattern data for future analysis."""
    signal_types = list({s.signal_type for s in signals})
    source_names = list({s.source_name for s in signals})

    timestamps = sorted([s.created_at for s in signals])
    if len(timestamps) > 1:
        spacings = [
            (timestamps[i + 1] - timestamps[i]).days
            for i in range(len(timestamps) - 1)
        ]
        avg_spacing = round(sum(spacings) / len(spacings), 1)
    else:
        avg_spacing = 0.0

    logger.info(
        "distress_pattern.observed",
        company_id=str(company.id),
        company_name=company.name,
        deal_score=deal_result.score,
        score_band=deal_result.band,
        composite_risk_score=company.composite_risk_score,
        risk_trend=company.risk_trend,
        signal_count=len(signals),
        signal_velocity=round(signal_velocity, 2),
        days_span=days_span,
        signal_types=signal_types,
        source_names=source_names,
        first_signal_at=str(min(s.created_at for s in signals)),
        latest_signal_at=str(max(s.created_at for s in signals)),
        avg_signal_spacing_days=avg_spacing,
    )


@router.get("/stats", response_model=CommandCenterStats)
@limiter.limit("60/minute")
async def get_command_center_stats(
    request: Request, db: DbSession, tenant_id: TenantId
):
    price_per_device = await _get_price_per_device(db, tenant_id)

    all_opps, total, total_pipeline_value, total_devices = await _build_opportunities(
        db, tenant_id, price_per_device, per_page=9999
    )

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    new_today = sum(1 for o in all_opps if o.latest_signal_at >= today_start)
    hot_count = sum(1 for o in all_opps if o.deal_score >= 85)

    # Watchlist count
    wl_count_result = await db.execute(
        select(func.count(Watchlist.id)).where(Watchlist.tenant_id == tenant_id)
    )
    watchlist_count = wl_count_result.scalar() or 0

    # 7-day pipeline value change (approximate: compare total vs opportunities older than 7 days)
    seven_days_ago = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = seven_days_ago - timedelta(days=7)
    old_value = sum(o.revenue_estimate for o in all_opps if o.latest_signal_at < seven_days_ago)
    new_value = sum(o.revenue_estimate for o in all_opps if o.latest_signal_at >= seven_days_ago)

    top_5 = sorted(all_opps, key=lambda o: o.deal_score, reverse=True)[:5]

    # Action counts — phase-aware
    calls_to_make = sum(1 for o in all_opps if o.predicted_phase == "active_liquidation")
    contacts_to_make = sum(1 for o in all_opps if o.predicted_phase == "early_outreach" and o.deal_score >= 55)

    # Recent changes: last 48h signals joined with companies
    cutoff = now - timedelta(hours=48)
    changes_q = (
        select(
            Signal.company_id,
            Company.name.label("company_name"),
            Signal.signal_type,
            Signal.title,
            Signal.source_name,
            Signal.created_at,
            Signal.device_estimate,
        )
        .join(Company, Company.id == Signal.company_id)
        .where(Signal.created_at >= cutoff)
        .order_by(Signal.created_at.desc())
        .limit(10)
    )
    changes_result = await db.execute(changes_q)
    recent_changes = [
        RecentChange(
            company_id=row.company_id,
            company_name=row.company_name,
            signal_type=row.signal_type,
            title=row.title,
            source_name=row.source_name,
            detected_at=row.created_at,
            device_estimate=row.device_estimate,
        )
        for row in changes_result.all()
    ]

    return CommandCenterStats(
        total_pipeline_value=total_pipeline_value,
        pipeline_value_change_7d=new_value,
        new_opportunities_today=new_today,
        hot_opportunities=hot_count,
        total_active_opportunities=total,
        total_devices_in_pipeline=total_devices,
        watchlist_count=watchlist_count,
        top_opportunities=top_5,
        calls_to_make=calls_to_make,
        contacts_to_make=contacts_to_make,
        recent_changes=recent_changes,
    )


@router.get("", response_model=OpportunityListResponse)
@limiter.limit("60/minute")
async def list_opportunities(
    request: Request,
    db: DbSession,
    tenant_id: TenantId,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    min_deal_score: int | None = None,
    min_devices: int | None = None,
    signal_type: str | None = None,
    state: str | None = None,
    industry: str | None = None,
    watchlist_only: bool = False,
    sort_by: str = "deal_score",
):
    price_per_device = await _get_price_per_device(db, tenant_id)

    paginated, total, total_pipeline_value, total_devices = await _build_opportunities(
        db,
        tenant_id,
        price_per_device,
        min_deal_score=min_deal_score,
        min_devices=min_devices,
        signal_type=signal_type,
        state=state,
        industry=industry,
        watchlist_only=watchlist_only,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )

    return OpportunityListResponse(
        opportunities=paginated,
        total=total,
        page=page,
        per_page=per_page,
        total_pipeline_value=total_pipeline_value,
        total_devices=total_devices,
    )


@router.get("/export/csv")
@limiter.limit("5/minute")
async def export_opportunities_csv(
    request: Request,
    db: DbSession,
    tp: TenantPlan,
):
    """Export all opportunities as CSV. Professional plan only."""
    if not tp.limits.csv_export:
        raise_plan_limit("csv_export", tp.plan, "CSV export requires the Professional plan.")

    price_per_device = await _get_price_per_device(db, tp.tenant_id)
    all_opps, total, _, _ = await _build_opportunities(
        db, tp.tenant_id, price_per_device, per_page=9999
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Company", "Ticker", "Industry", "State", "Deal Score", "Score Band",
        "Devices", "Revenue Estimate", "Signal Count", "Signal Types",
        "Sources", "Risk Score", "Risk Trend", "Latest Signal", "Disposition Window",
        "Predicted Phase", "Justification",
    ])
    for o in all_opps:
        writer.writerow([
            o.company_name, o.ticker or "", o.industry or "", o.headquarters_state or "",
            o.deal_score, o.score_band_label,
            o.total_device_estimate, f"{o.revenue_estimate:.2f}",
            o.signal_count, "; ".join(o.signal_types),
            "; ".join(o.source_names), o.composite_risk_score, o.risk_trend,
            o.latest_signal_at.isoformat() if o.latest_signal_at else "",
            o.disposition_window or "",
            o.predicted_phase_label,
            o.justification,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=opportunities.csv"},
    )


@router.get("/gaps", response_model=GapDetectionResponse)
@limiter.limit("60/minute")
async def detect_opportunity_gaps(
    request: Request,
    db: DbSession,
    tenant_id: TenantId,
    limit: int = Query(5, ge=1, le=20),
):
    """Detect high-value unwatched opportunities matching the tenant's profile."""
    from app.models import Tenant

    price_per_device = await _get_price_per_device(db, tenant_id)

    # 1. Get all opportunities (unpaginated)
    all_opps, total_opps, _, _ = await _build_opportunities(
        db, tenant_id, price_per_device, per_page=9999
    )

    # 2. Get watched companies with their metadata
    wl_query = (
        select(
            Watchlist.company_id,
            Company.industry,
            Company.headquarters_state,
        )
        .join(Company, Company.id == Watchlist.company_id)
        .where(Watchlist.tenant_id == tenant_id)
    )
    wl_result = await db.execute(wl_query)
    wl_rows = wl_result.all()

    watched_ids = {r.company_id for r in wl_rows}
    watched_companies = [
        {
            "headquarters_state": r.headquarters_state,
            "industry": r.industry,
        }
        for r in wl_rows
    ]

    # 3. Get signal types for watched companies
    watched_signal_types: list[str] = []
    if watched_ids:
        sig_result = await db.execute(
            select(Signal.signal_type).where(
                Signal.company_id.in_(watched_ids)
            )
        )
        watched_signal_types = [r[0] for r in sig_result.all() if r[0]]

    # 4. Derive profile
    inferred = derive_profile_from_watchlist(watched_companies, watched_signal_types)

    # 5. Load explicit preferences
    tenant = await db.get(Tenant, tenant_id)
    explicit_prefs = (tenant.settings or {}).get("gap_preferences") if tenant else None
    is_explicit = explicit_prefs is not None and any(
        explicit_prefs.get(k) for k in ("states", "industries", "signal_types")
    )

    # 6. Merge
    profile = merge_with_explicit_prefs(inferred, explicit_prefs)

    # 7. Detect gaps
    gap_results, total_uncovered = detect_gaps(
        all_opps, watched_ids, profile, limit=limit
    )

    # 8. Build response
    gaps = [
        GapOpportunityOut(
            opportunity=opp,
            gap_score=gap_match.gap_score,
            match_reasons=gap_match.match_reasons,
            is_new=gap_match.is_new,
        )
        for opp, gap_match in gap_results
    ]

    profile_summary = TenantProfileSummary(
        states=profile.states,
        industries=profile.industries,
        signal_types=profile.signal_types,
        min_deal_score=profile.min_deal_score,
        is_explicit=is_explicit,
        watchlist_count=len(watched_ids),
    )

    return GapDetectionResponse(
        gaps=gaps,
        profile=profile_summary,
        total_uncovered=total_uncovered,
    )


@router.get("/{company_id}", response_model=OpportunityDetailOut)
@limiter.limit("60/minute")
async def get_opportunity(
    request: Request,
    company_id: UUID,
    db: DbSession,
    tp: TenantPlan,
):
    tenant_id = tp.tenant_id
    price_per_device = await _get_price_per_device(db, tenant_id)

    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Load all signals for this company
    result = await db.execute(
        select(Signal)
        .where(Signal.company_id == company_id)
        .order_by(Signal.created_at.desc())
    )
    signals = result.scalars().all()

    if not signals:
        raise HTTPException(status_code=404, detail="No signals found for this company")

    # Check if watched — fetch full row for pipeline fields
    wl_result = await db.execute(
        select(Watchlist).where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.company_id == company_id,
        )
    )
    watchlist_row = wl_result.scalar_one_or_none()
    is_watched = watchlist_row is not None

    now = datetime.now(timezone.utc)
    total_devices = sum(s.device_estimate or 0 for s in signals)
    avg_confidence = sum(s.confidence_score for s in signals) / len(signals)
    avg_severity = sum(s.severity_score for s in signals) / len(signals)
    source_names = list({s.source_name for s in signals})
    signal_types = list({s.signal_type for s in signals})
    latest_at = max(s.created_at for s in signals)
    earliest_at = min(s.created_at for s in signals)
    days_since = (now - latest_at.replace(tzinfo=timezone.utc)).days

    deal_result = compute_deal_score(
        avg_severity=avg_severity,
        avg_confidence=avg_confidence,
        composite_risk_score=company.composite_risk_score or 0,
        total_devices=total_devices,
        source_diversity=len(source_names),
        signal_types=signal_types,
        days_since_latest=days_since,
        source_names=source_names,
        risk_trend=company.risk_trend or "stable",
        signal_count=len(signals),
    )

    # Compute signal velocity
    days_span = (latest_at.replace(tzinfo=timezone.utc) - earliest_at.replace(tzinfo=timezone.utc)).days
    signal_velocity = round(len(signals) / max(1, days_span) * 30, 1)

    disposition = get_disposition_window(signal_types)
    revenue = total_devices * price_per_device

    timing = predict_phase(
        signal_types=signal_types,
        days_since_latest=days_since,
        signal_velocity=signal_velocity,
        employee_count=company.employee_count,
        disposition_window=disposition,
        risk_trend=company.risk_trend or "stable",
        signal_count=len(signals),
    )

    # Extract AI analysis fields from best signal's metadata
    best_signal = max(signals, key=lambda s: s.severity_score)
    cached_analysis = (best_signal.metadata_ or {}).get("analysis_cache", {})
    recommended_actions = cached_analysis.get("recommended_actions")
    asset_opportunity = cached_analysis.get("asset_opportunity")
    likely_asset_types = cached_analysis.get("likely_asset_types", [])

    # Generate justifications
    justification = generate_compact_justification(
        company_name=company.name,
        signal_types=signal_types,
        source_names=source_names,
        total_devices=total_devices,
        revenue_estimate=revenue,
        disposition_window=disposition,
        deal_score=deal_result.score,
        score_band=deal_result.band,
        risk_trend=company.risk_trend or "stable",
        source_diversity=len(source_names),
        days_since_latest=days_since,
        penalty_applied=deal_result.penalty_applied,
    )

    deal_justification, justification_is_new = await generate_full_justification(
        company=company,
        company_name=company.name,
        signal_types=signal_types,
        source_names=source_names,
        total_devices=total_devices,
        revenue_estimate=revenue,
        disposition_window=disposition,
        deal_score=deal_result.score,
        score_band_label=deal_result.band_label,
        risk_trend=company.risk_trend or "stable",
        avg_severity=avg_severity,
        avg_confidence=avg_confidence,
        signal_count=len(signals),
    )

    if justification_is_new:
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(company, "metadata_")
        await db.commit()

    # Log distress pattern
    _log_distress_pattern(company, deal_result, signals, signal_velocity, days_span)

    signal_outs = []
    for s in signals:
        out = SignalOut.model_validate(s)
        out.company_name = company.name
        signal_outs.append(out)

    score_breakdown = _result_to_breakdown(deal_result)

    # Truncate score breakdown for non-pro plans
    if tp.limits.score_breakdown_mode == "compact" and score_breakdown:
        score_breakdown.factors = score_breakdown.factors[:3]

    # Get contact count for this company
    cc_result = await db.execute(
        select(func.count(Contact.id)).where(Contact.company_id == company_id)
    )
    contact_count = cc_result.scalar() or 0

    return OpportunityDetailOut(
        company_id=company.id,
        company_name=company.name,
        ticker=company.ticker,
        industry=company.industry,
        headquarters_state=company.headquarters_state,
        employee_count=company.employee_count,
        composite_risk_score=company.composite_risk_score or 0,
        risk_trend=company.risk_trend or "stable",
        deal_score=deal_result.score,
        score_band=deal_result.band,
        score_band_label=deal_result.band_label,
        signal_count=len(signals),
        total_device_estimate=total_devices,
        revenue_estimate=revenue,
        latest_signal_at=latest_at,
        disposition_window=disposition,
        signal_types=signal_types,
        source_names=source_names,
        source_diversity=len(source_names),
        is_watched=is_watched,
        top_factors=deal_result.top_factors,
        has_contacts=contact_count > 0,
        contact_count=contact_count,
        justification=justification,
        predicted_phase=timing.phase,
        predicted_phase_label=timing.phase_label,
        phase_verb=timing.verb,
        signals=signal_outs,
        avg_confidence=round(avg_confidence, 1),
        avg_severity=round(avg_severity, 1),
        recommended_actions=recommended_actions,
        asset_opportunity=asset_opportunity,
        likely_asset_types=likely_asset_types,
        score_breakdown=score_breakdown,
        signal_velocity=signal_velocity,
        domain=company.domain,
        deal_justification=deal_justification,
        phase_explanation=timing.explanation,
        phase_confidence=timing.confidence,
        watchlist_id=watchlist_row.id if watchlist_row else None,
        watchlist_status=watchlist_row.status if watchlist_row else None,
        watchlist_priority=watchlist_row.priority if watchlist_row else None,
        follow_up_at=watchlist_row.follow_up_at if watchlist_row else None,
    )
