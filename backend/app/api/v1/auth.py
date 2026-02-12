import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.api.v1.deps import CurrentUserId, DbSession
from app.config import settings
from app.models import Tenant, User
from app.plan_limits import get_plan_limits
from app.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCallbackRequest(BaseModel):
    email: str
    full_name: str | None = None
    tenant_name: str | None = None
    company_name: str | None = None
    job_title: str | None = None
    referral_source: str | None = None


class ProfileUpdateRequest(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    referral_source: str | None = None
    full_name: str | None = None


class AuthCallbackResponse(BaseModel):
    user_id: str
    tenant_id: str
    tenant_slug: str


@router.post("/callback", response_model=AuthCallbackResponse)
@limiter.limit("10/minute")
async def auth_callback(request: Request, body: AuthCallbackRequest, user_id: CurrentUserId, db: DbSession):
    """Post-auth hook: ensure user + tenant records exist after Supabase sign-up."""
    existing = await db.get(User, user_id)
    if existing:
        return AuthCallbackResponse(
            user_id=str(existing.id),
            tenant_id=str(existing.tenant_id),
            tenant_slug=(await db.get(Tenant, existing.tenant_id)).slug,
        )

    # Create tenant
    tenant_name = body.tenant_name or body.email.split("@")[0]
    slug = re.sub(r"[^a-z0-9-]", "-", tenant_name.lower())[:100]
    # Ensure unique slug
    slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    tenant = Tenant(
        name=tenant_name,
        slug=slug,
        plan="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=3),
    )
    db.add(tenant)
    await db.flush()

    user = User(
        id=user_id,
        tenant_id=tenant.id,
        email=body.email,
        full_name=body.full_name,
        company_name=body.company_name,
        job_title=body.job_title,
        referral_source=body.referral_source,
        role="owner",
    )
    db.add(user)
    await db.flush()

    return AuthCallbackResponse(
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        tenant_slug=tenant.slug,
    )


@router.get("/me")
@limiter.limit("10/minute")
async def get_me(request: Request, user_id: CurrentUserId, db: DbSession):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    tenant = await db.get(Tenant, user.tenant_id)

    # Auto-expire trial
    if tenant and tenant.plan == "trialing" and tenant.trial_ends_at:
        if datetime.now(timezone.utc) > tenant.trial_ends_at:
            tenant.plan = "free"
            tenant.trial_ends_at = None
            await db.flush()

    plan = tenant.plan if tenant else "free"

    # Admin override: always grant full access
    admin_emails = {e.strip() for e in settings.admin_emails.split(",") if e.strip()}
    if user.email in admin_emails:
        plan = "pro"

    limits = get_plan_limits(plan)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "company_name": user.company_name,
        "job_title": user.job_title,
        "referral_source": user.referral_source,
        "role": user.role,
        "tenant_id": str(user.tenant_id),
        "tenant_name": tenant.name if tenant else None,
        "plan": plan,
        "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant and tenant.trial_ends_at else None,
        "plan_limits": {
            "max_watchlist_companies": limits.max_watchlist_companies,
            "max_active_alerts": limits.max_active_alerts,
            "max_signal_analyses_per_day": limits.max_signal_analyses_per_day,
            "allowed_alert_frequencies": limits.allowed_alert_frequencies,
            "signal_history_days": limits.signal_history_days,
            "score_breakdown_mode": limits.score_breakdown_mode,
            "csv_export": limits.csv_export,
            "team_pipeline": limits.team_pipeline,
        },
    }


@router.patch("/profile")
@limiter.limit("10/minute")
async def update_profile(request: Request, body: ProfileUpdateRequest, user_id: CurrentUserId, db: DbSession):
    """Update the current user's profile fields."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.company_name is not None:
        user.company_name = body.company_name
    if body.job_title is not None:
        user.job_title = body.job_title
    if body.referral_source is not None:
        user.referral_source = body.referral_source

    await db.flush()

    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "company_name": user.company_name,
        "job_title": user.job_title,
        "referral_source": user.referral_source,
    }
