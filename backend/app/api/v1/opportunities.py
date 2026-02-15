import csv
import io
from datetime import datetime, timezone
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
from app.rate_limit import limiter
from app.schemas.opportunity import (
    CommandCenterStats,
    OpportunityDetailOut,
    OpportunityListResponse,
    OpportunityOut,
    ScoreBreakdownOut,
    ScoreFactorOut,
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
    from datetime import timedelta

    seven_days_ago = seven_days_ago - timedelta(days=7)
    old_value = sum(o.revenue_estimate for o in all_opps if o.latest_signal_at < seven_days_ago)
    new_value = sum(o.revenue_estimate for o in all_opps if o.latest_signal_at >= seven_days_ago)

    top_5 = sorted(all_opps, key=lambda o: o.deal_score, reverse=True)[:5]

    return CommandCenterStats(
        total_pipeline_value=total_pipeline_value,
        pipeline_value_change_7d=new_value,
        new_opportunities_today=new_today,
        hot_opportunities=hot_count,
        total_active_opportunities=total,
        total_devices_in_pipeline=total_devices,
        watchlist_count=watchlist_count,
        top_opportunities=top_5,
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
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=opportunities.csv"},
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

    # Check if watched
    wl_result = await db.execute(
        select(Watchlist.id).where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.company_id == company_id,
        )
    )
    is_watched = wl_result.scalar_one_or_none() is not None

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

    # Extract AI analysis fields from best signal's metadata
    best_signal = max(signals, key=lambda s: s.severity_score)
    cached_analysis = (best_signal.metadata_ or {}).get("analysis_cache", {})
    recommended_actions = cached_analysis.get("recommended_actions")
    asset_opportunity = cached_analysis.get("asset_opportunity")
    likely_asset_types = cached_analysis.get("likely_asset_types", [])

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
        signals=signal_outs,
        avg_confidence=round(avg_confidence, 1),
        avg_severity=round(avg_severity, 1),
        recommended_actions=recommended_actions,
        asset_opportunity=asset_opportunity,
        likely_asset_types=likely_asset_types,
        score_breakdown=score_breakdown,
        signal_velocity=signal_velocity,
        domain=company.domain,
    )
