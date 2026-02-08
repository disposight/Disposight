import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.v1.deps import CurrentUserId, DbSession
from app.models import Tenant, User

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCallbackRequest(BaseModel):
    email: str
    full_name: str | None = None
    tenant_name: str | None = None


class AuthCallbackResponse(BaseModel):
    user_id: str
    tenant_id: str
    tenant_slug: str


@router.post("/callback", response_model=AuthCallbackResponse)
async def auth_callback(body: AuthCallbackRequest, user_id: CurrentUserId, db: DbSession):
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
async def get_me(user_id: CurrentUserId, db: DbSession):
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

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "tenant_id": str(user.tenant_id),
        "tenant_name": tenant.name if tenant else None,
        "plan": tenant.plan if tenant else None,
        "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant and tenant.trial_ends_at else None,
    }
