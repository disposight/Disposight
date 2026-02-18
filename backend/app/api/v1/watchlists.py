from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import aliased

from app.api.v1.deps import CurrentUserId, DbSession, TenantId, TenantPlan
from app.models import Company, User, Watchlist
from app.models.pipeline_activity import PipelineActivity
from app.plan_limits import raise_plan_limit
from app.rate_limit import limiter
from app.schemas.watchlist import (
    FollowUpItem,
    PipelineActivityCreate,
    PipelineActivityOut,
    PipelineSummary,
    WatchlistAdd,
    WatchlistFollowUpUpdate,
    WatchlistOut,
    WatchlistPriorityUpdate,
    WatchlistStatusUpdate,
    VALID_STATUSES,
)

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


async def _log_activity(
    db,
    watchlist_id: UUID,
    tenant_id: UUID,
    user_id: UUID,
    activity_type: str,
    title: str,
    body: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
) -> PipelineActivity:
    activity = PipelineActivity(
        watchlist_id=watchlist_id,
        tenant_id=tenant_id,
        user_id=user_id,
        activity_type=activity_type,
        title=title,
        body=body,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(activity)
    # Update last_activity_at on the watchlist
    from sqlalchemy import update
    await db.execute(
        update(Watchlist)
        .where(Watchlist.id == watchlist_id)
        .values(last_activity_at=datetime.now(timezone.utc))
    )
    return activity


def _build_watchlist_out(row) -> WatchlistOut:
    item = row[0]
    company_name = row[1]
    composite_risk_score = row[2]
    claimed_by_name = row[3] if len(row) > 3 else None
    activity_count = row[4] if len(row) > 4 else 0
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status or "identified",
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        priority=item.priority or "medium",
        follow_up_at=item.follow_up_at,
        last_activity_at=item.last_activity_at,
        closed_at=item.closed_at,
        lost_reason=item.lost_reason,
        company_name=company_name,
        composite_risk_score=composite_risk_score,
        claimed_by_name=claimed_by_name,
        activity_count=activity_count or 0,
    )


def _enriched_query(tenant_filter):
    """Build the enriched watchlist query with claimed_by_name and activity_count."""
    ClaimedUser = aliased(User)
    activity_count_sub = (
        select(func.count(PipelineActivity.id))
        .where(PipelineActivity.watchlist_id == Watchlist.id)
        .correlate(Watchlist)
        .scalar_subquery()
    )
    return (
        select(
            Watchlist,
            Company.name,
            Company.composite_risk_score,
            ClaimedUser.full_name,
            activity_count_sub,
        )
        .join(Company, Watchlist.company_id == Company.id)
        .outerjoin(ClaimedUser, Watchlist.claimed_by == ClaimedUser.id)
        .where(tenant_filter)
    )


@router.get("", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def list_watchlist(request: Request, db: DbSession, tenant_id: TenantId):
    query = _enriched_query(Watchlist.tenant_id == tenant_id).order_by(
        Company.composite_risk_score.desc()
    )
    result = await db.execute(query)
    return [_build_watchlist_out(row) for row in result.all()]


@router.post("", response_model=WatchlistOut, status_code=201)
@limiter.limit("20/minute")
async def add_to_watchlist(
    request: Request, body: WatchlistAdd, db: DbSession, tp: TenantPlan, user_id: CurrentUserId
):
    tenant_id = tp.tenant_id

    company = await db.get(Company, body.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.tenant_id == tenant_id, Watchlist.company_id == body.company_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already in watchlist")

    # Enforce watchlist cap
    count_result = await db.execute(
        select(func.count(Watchlist.id)).where(Watchlist.tenant_id == tenant_id)
    )
    current_count = count_result.scalar() or 0
    if current_count >= tp.limits.max_watchlist_companies:
        raise_plan_limit(
            "watchlist_companies",
            tp.plan,
            f"Watchlist limit reached ({current_count}/{tp.limits.max_watchlist_companies}). Upgrade for more.",
        )

    now = datetime.now(timezone.utc)
    item = Watchlist(
        tenant_id=tenant_id,
        company_id=body.company_id,
        added_by=user_id,
        notes=body.notes,
        last_activity_at=now,
    )
    db.add(item)
    await db.flush()

    # Auto-log creation activity
    await _log_activity(
        db, item.id, tenant_id, user_id,
        "status_change", f"Added {company.name} to pipeline",
        new_value="identified",
    )
    await db.flush()

    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status or "identified",
        created_at=item.created_at,
        priority=item.priority or "medium",
        last_activity_at=item.last_activity_at,
        company_name=company.name,
        composite_risk_score=company.composite_risk_score,
        activity_count=1,
    )


@router.delete("/{watchlist_id}", status_code=204)
@limiter.limit("20/minute")
async def remove_from_watchlist(request: Request, watchlist_id: UUID, db: DbSession, tenant_id: TenantId):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await db.delete(item)


@router.put("/{watchlist_id}/claim", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def claim_lead(
    request: Request, watchlist_id: UUID, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    old_status = item.status
    item.claimed_by = user_id
    item.claimed_at = datetime.now(timezone.utc)

    # Auto-advance from identified to researching
    if item.status == "identified":
        item.status = "researching"

    await db.flush()

    # Log claim activity
    await _log_activity(
        db, item.id, tenant_id, user_id,
        "claim", "Claimed this lead",
        old_value=old_status, new_value=item.status,
    )
    await db.flush()

    company = await db.get(Company, item.company_id)
    # Get user name
    claimer = await db.get(User, user_id)
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        priority=item.priority or "medium",
        follow_up_at=item.follow_up_at,
        last_activity_at=item.last_activity_at,
        closed_at=item.closed_at,
        lost_reason=item.lost_reason,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
        claimed_by_name=claimer.full_name if claimer else None,
    )


@router.put("/{watchlist_id}/status", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def update_lead_status(
    request: Request,
    watchlist_id: UUID,
    body: WatchlistStatusUpdate,
    db: DbSession,
    tenant_id: TenantId,
    user_id: CurrentUserId,
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    # Require lost_reason when moving to lost
    if body.status == "lost" and not body.lost_reason:
        raise HTTPException(status_code=400, detail="lost_reason is required when setting status to lost")

    old_status = item.status
    item.status = body.status

    if body.status == "lost":
        item.lost_reason = body.lost_reason
        item.closed_at = datetime.now(timezone.utc)
    elif body.status == "won":
        item.closed_at = datetime.now(timezone.utc)

    if body.status in ("researching", "contacted", "negotiating") and not item.claimed_by:
        item.claimed_by = user_id
        item.claimed_at = datetime.now(timezone.utc)

    await db.flush()

    # Log status change
    await _log_activity(
        db, item.id, tenant_id, user_id,
        "status_change", f"Status changed from {old_status} to {body.status}",
        old_value=old_status, new_value=body.status,
    )
    await db.flush()

    company = await db.get(Company, item.company_id)
    claimer = await db.get(User, item.claimed_by) if item.claimed_by else None
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        priority=item.priority or "medium",
        follow_up_at=item.follow_up_at,
        last_activity_at=item.last_activity_at,
        closed_at=item.closed_at,
        lost_reason=item.lost_reason,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
        claimed_by_name=claimer.full_name if claimer else None,
    )


@router.put("/{watchlist_id}/priority", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def update_lead_priority(
    request: Request,
    watchlist_id: UUID,
    body: WatchlistPriorityUpdate,
    db: DbSession,
    tenant_id: TenantId,
    user_id: CurrentUserId,
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    old_priority = item.priority
    item.priority = body.priority
    await db.flush()

    await _log_activity(
        db, item.id, tenant_id, user_id,
        "priority_change", f"Priority changed from {old_priority} to {body.priority}",
        old_value=old_priority, new_value=body.priority,
    )
    await db.flush()

    company = await db.get(Company, item.company_id)
    claimer = await db.get(User, item.claimed_by) if item.claimed_by else None
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        priority=item.priority or "medium",
        follow_up_at=item.follow_up_at,
        last_activity_at=item.last_activity_at,
        closed_at=item.closed_at,
        lost_reason=item.lost_reason,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
        claimed_by_name=claimer.full_name if claimer else None,
    )


@router.put("/{watchlist_id}/follow-up", response_model=WatchlistOut)
@limiter.limit("20/minute")
async def update_follow_up(
    request: Request,
    watchlist_id: UUID,
    body: WatchlistFollowUpUpdate,
    db: DbSession,
    tenant_id: TenantId,
    user_id: CurrentUserId,
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    item.follow_up_at = body.follow_up_at
    await db.flush()

    activity_type = "follow_up_set" if body.follow_up_at else "follow_up_cleared"
    title = f"Follow-up {'set for ' + body.follow_up_at.strftime('%b %d, %Y') if body.follow_up_at else 'cleared'}"
    await _log_activity(
        db, item.id, tenant_id, user_id,
        activity_type, title,
    )
    await db.flush()

    company = await db.get(Company, item.company_id)
    claimer = await db.get(User, item.claimed_by) if item.claimed_by else None
    return WatchlistOut(
        id=item.id,
        company_id=item.company_id,
        notes=item.notes,
        status=item.status,
        claimed_by=item.claimed_by,
        claimed_at=item.claimed_at,
        created_at=item.created_at,
        priority=item.priority or "medium",
        follow_up_at=item.follow_up_at,
        last_activity_at=item.last_activity_at,
        closed_at=item.closed_at,
        lost_reason=item.lost_reason,
        company_name=company.name if company else None,
        composite_risk_score=company.composite_risk_score if company else None,
        claimed_by_name=claimer.full_name if claimer else None,
    )


@router.post("/{watchlist_id}/activities", response_model=PipelineActivityOut, status_code=201)
@limiter.limit("20/minute")
async def create_activity(
    request: Request,
    watchlist_id: UUID,
    body: PipelineActivityCreate,
    db: DbSession,
    tenant_id: TenantId,
    user_id: CurrentUserId,
):
    item = await db.get(Watchlist, watchlist_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    activity = await _log_activity(
        db, item.id, tenant_id, user_id,
        body.activity_type, body.title, body=body.body,
    )
    await db.flush()

    user = await db.get(User, user_id)
    return PipelineActivityOut(
        id=activity.id,
        watchlist_id=activity.watchlist_id,
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        title=activity.title,
        body=activity.body,
        old_value=activity.old_value,
        new_value=activity.new_value,
        created_at=activity.created_at,
        user_name=user.full_name if user else None,
    )


@router.get("/{watchlist_id}/activities", response_model=list[PipelineActivityOut])
@limiter.limit("60/minute")
async def list_activities(
    request: Request, watchlist_id: UUID, db: DbSession, tenant_id: TenantId
):
    result = await db.execute(
        select(PipelineActivity, User.full_name)
        .outerjoin(User, PipelineActivity.user_id == User.id)
        .where(
            PipelineActivity.watchlist_id == watchlist_id,
            PipelineActivity.tenant_id == tenant_id,
        )
        .order_by(PipelineActivity.created_at.desc())
    )
    return [
        PipelineActivityOut(
            id=row[0].id,
            watchlist_id=row[0].watchlist_id,
            user_id=row[0].user_id,
            activity_type=row[0].activity_type,
            title=row[0].title,
            body=row[0].body,
            old_value=row[0].old_value,
            new_value=row[0].new_value,
            created_at=row[0].created_at,
            user_name=row[1],
        )
        for row in result.all()
    ]


@router.get("/follow-ups", response_model=list[FollowUpItem])
@limiter.limit("60/minute")
async def list_follow_ups(request: Request, db: DbSession, tenant_id: TenantId):
    ClaimedUser = aliased(User)
    result = await db.execute(
        select(Watchlist, Company.name, ClaimedUser.full_name)
        .join(Company, Watchlist.company_id == Company.id)
        .outerjoin(ClaimedUser, Watchlist.claimed_by == ClaimedUser.id)
        .where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.follow_up_at.isnot(None),
        )
        .order_by(Watchlist.follow_up_at.asc())
    )

    now = datetime.now(timezone.utc)
    items = []
    for row in result.all():
        w = row[0]
        fu_at = w.follow_up_at
        delta = (fu_at - now).days if fu_at else 0
        items.append(FollowUpItem(
            watchlist_id=w.id,
            company_id=w.company_id,
            company_name=row[1],
            follow_up_at=fu_at,
            status=w.status or "identified",
            priority=w.priority or "medium",
            is_overdue=fu_at < now if fu_at else False,
            days_until=delta,
            claimed_by_name=row[2],
        ))
    return items


@router.get("/summary", response_model=PipelineSummary)
@limiter.limit("60/minute")
async def pipeline_summary(request: Request, db: DbSession, tenant_id: TenantId):
    # Total count
    total_result = await db.execute(
        select(func.count(Watchlist.id)).where(Watchlist.tenant_id == tenant_id)
    )
    total = total_result.scalar() or 0

    # By status
    status_result = await db.execute(
        select(Watchlist.status, func.count(Watchlist.id))
        .where(Watchlist.tenant_id == tenant_id)
        .group_by(Watchlist.status)
    )
    by_status = {row[0]: row[1] for row in status_result.all()}

    # Overdue follow-ups
    now = datetime.now(timezone.utc)
    overdue_result = await db.execute(
        select(func.count(Watchlist.id)).where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.follow_up_at.isnot(None),
            Watchlist.follow_up_at < now,
            Watchlist.status.notin_(["won", "lost"]),
        )
    )
    overdue = overdue_result.scalar() or 0

    # Won/lost this month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    won_result = await db.execute(
        select(func.count(Watchlist.id)).where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.status == "won",
            Watchlist.closed_at >= month_start,
        )
    )
    won = won_result.scalar() or 0

    lost_result = await db.execute(
        select(func.count(Watchlist.id)).where(
            Watchlist.tenant_id == tenant_id,
            Watchlist.status == "lost",
            Watchlist.closed_at >= month_start,
        )
    )
    lost = lost_result.scalar() or 0

    return PipelineSummary(
        total=total,
        by_status=by_status,
        overdue_follow_ups=overdue,
        won_this_month=won,
        lost_this_month=lost,
    )


@router.get("/my-pipeline", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def my_pipeline(request: Request, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId):
    query = _enriched_query(Watchlist.tenant_id == tenant_id).where(
        (Watchlist.claimed_by == user_id) | (Watchlist.added_by == user_id)
    ).order_by(Company.composite_risk_score.desc())
    result = await db.execute(query)
    return [_build_watchlist_out(row) for row in result.all()]


@router.get("/team-pipeline", response_model=list[WatchlistOut])
@limiter.limit("60/minute")
async def team_pipeline(request: Request, db: DbSession, tp: TenantPlan):
    if not tp.limits.team_pipeline:
        raise_plan_limit("team_pipeline", tp.plan, "Team Pipeline requires the Professional plan.")
    tenant_id = tp.tenant_id
    query = _enriched_query(Watchlist.tenant_id == tenant_id).where(
        Watchlist.status != "identified"
    ).order_by(Company.composite_risk_score.desc())
    result = await db.execute(query)
    return [_build_watchlist_out(row) for row in result.all()]
