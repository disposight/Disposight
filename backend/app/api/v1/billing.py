import stripe
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.api.v1.deps import CurrentUserId, DbSession, TenantId
from app.config import settings
from app.models import Subscription, Tenant, User
from app.rate_limit import limiter

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.stripe_secret_key


def _price_to_plan(price_id: str) -> str:
    """Map a Stripe price ID to a plan name."""
    mapping = {
        settings.stripe_starter_price_id: "starter",
        settings.stripe_pro_price_id: "pro",
        settings.stripe_starter_yearly_price_id: "starter",
        settings.stripe_pro_yearly_price_id: "pro",
    }
    return mapping.get(price_id, "starter")


def _resolve_price_id(price_id: str) -> str:
    """Resolve a friendly price key to a Stripe price ID."""
    friendly_map = {
        "starter": settings.stripe_starter_price_id,
        "pro": settings.stripe_pro_price_id,
        "starter_yearly": settings.stripe_starter_yearly_price_id,
        "pro_yearly": settings.stripe_pro_yearly_price_id,
    }
    return friendly_map.get(price_id, price_id) or settings.stripe_starter_price_id


class CheckoutRequest(BaseModel):
    price_id: str = ""


@router.post("/checkout")
@limiter.limit("5/minute")
async def create_checkout(request: Request, body: CheckoutRequest, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get or create Stripe customer
    if not tenant.stripe_customer_id:
        user = await db.get(User, user_id)
        customer = stripe.Customer.create(
            email=user.email if user else None,
            name=user.full_name if user else None,
            metadata={"tenant_id": str(tenant_id)},
        )
        tenant.stripe_customer_id = customer.id
        await db.flush()

    session = stripe.checkout.Session.create(
        customer=tenant.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": _resolve_price_id(body.price_id) if body.price_id else settings.stripe_starter_price_id, "quantity": 1}],
        ui_mode="embedded",
        return_url=f"{settings.frontend_url}/dashboard/settings?billing=success",
    )

    return {"client_secret": session.client_secret}


@router.post("/subscribe")
@limiter.limit("5/minute")
async def create_subscription(request: Request, body: CheckoutRequest, db: DbSession, tenant_id: TenantId, user_id: CurrentUserId):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get or create Stripe customer
    if not tenant.stripe_customer_id:
        user = await db.get(User, user_id)
        customer = stripe.Customer.create(
            email=user.email if user else None,
            name=user.full_name if user else None,
            metadata={"tenant_id": str(tenant_id)},
        )
        tenant.stripe_customer_id = customer.id
        await db.flush()

    subscription = stripe.Subscription.create(
        customer=tenant.stripe_customer_id,
        items=[{"price": _resolve_price_id(body.price_id) if body.price_id else settings.stripe_starter_price_id}],
        payment_behavior="default_incomplete",
        payment_settings={"save_default_payment_method": "on_subscription"},
        expand=["latest_invoice.payment_intent"],
    )

    return {
        "client_secret": subscription.latest_invoice.payment_intent.client_secret,
        "subscription_id": subscription.id,
    }


@router.get("/portal")
@limiter.limit("5/minute")
async def customer_portal(request: Request, db: DbSession, tenant_id: TenantId):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    tenant = await db.get(Tenant, tenant_id)
    if not tenant or not tenant.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No billing account found")

    session = stripe.billing_portal.Session.create(
        customer=tenant.stripe_customer_id,
        return_url=f"{settings.frontend_url}/dashboard/settings",
    )
    return {"portal_url": session.url}


@router.post("/webhook")
@limiter.limit("60/minute")
async def stripe_webhook(request: Request, db: DbSession):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhooks not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if customer_id and subscription_id:
            # Find tenant by Stripe customer ID
            from sqlalchemy import select

            result = await db.execute(
                select(Tenant).where(Tenant.stripe_customer_id == customer_id)
            )
            tenant = result.scalar_one_or_none()
            if tenant:
                # Resolve plan from the Stripe subscription's price
                plan_name = "starter"
                try:
                    stripe_sub = stripe.Subscription.retrieve(subscription_id)
                    if stripe_sub["items"]["data"]:
                        price_id = stripe_sub["items"]["data"][0]["price"]["id"]
                        plan_name = _price_to_plan(price_id)
                except Exception:
                    pass

                tenant.stripe_subscription_id = subscription_id
                tenant.plan = plan_name
                tenant.trial_ends_at = None  # Clear trial on paid conversion

                sub = Subscription(
                    tenant_id=tenant.id,
                    stripe_subscription_id=subscription_id,
                    stripe_customer_id=customer_id,
                    plan_name=plan_name,
                    status="active",
                )
                db.add(sub)

    elif event["type"] == "customer.subscription.updated":
        sub_data = event["data"]["object"]
        from sqlalchemy import select

        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == sub_data["id"]
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            # Update plan based on current price
            if sub_data["items"]["data"]:
                price_id = sub_data["items"]["data"][0]["price"]["id"]
                new_plan = _price_to_plan(price_id)
                sub.plan_name = new_plan
                sub.status = sub_data["status"]

                tenant = await db.get(Tenant, sub.tenant_id)
                if tenant:
                    if sub_data["status"] == "active":
                        tenant.plan = new_plan
                    elif sub_data["status"] in ("past_due", "unpaid"):
                        tenant.plan = "free"

    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        from sqlalchemy import select

        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == sub_data["id"]
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            tenant = await db.get(Tenant, sub.tenant_id)
            if tenant:
                tenant.plan = "free"

    return {"received": True}
