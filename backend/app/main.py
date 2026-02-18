import uuid

import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.rate_limit import limiter

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment="production" if not settings.debug else "development",
    )

SENSITIVE_FIELDS = frozenset({
    "access_token", "refresh_token", "password", "secret",
    "api_key", "authorization", "stripe_secret_key",
    "supabase_jwt_secret", "resend_api_key", "openai_api_key",
})


def mask_sensitive_data(logger, method_name, event_dict):
    """Structlog processor that redacts sensitive fields before logging."""
    for key in list(event_dict.keys()):
        if key.lower() in SENSITIVE_FIELDS:
            event_dict[key] = "***REDACTED***"
    return event_dict


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        mask_sensitive_data,
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)


logger = structlog.get_logger()


MAX_BODY_SIZE = 1_048_576  # 1 MB
BODY_SIZE_EXEMPT_PATHS = frozenset({"/api/v1/billing/webhook"})


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject request bodies larger than MAX_BODY_SIZE (1 MB)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in BODY_SIZE_EXEMPT_PATHS:
            return await call_next(request)

        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})

        # Guard against chunked transfers with no content-length
        if request.method in ("POST", "PUT", "PATCH"):
            body = await request.body()
            if len(body) > MAX_BODY_SIZE:
                return JSONResponse(status_code=413, content={"detail": "Request body too large"})

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        return response


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/api/docs" if settings.debug else None,
        redoc_url=None,
    )

    origins = [settings.frontend_url]
    if settings.allowed_origins:
        origins.extend(settings.allowed_origins.split(","))

    # Global unhandled exception handler
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        error_id = uuid.uuid4().hex[:8]
        logger.error(
            "unhandled_exception",
            error_id=error_id,
            method=request.method,
            path=str(request.url.path),
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error_id": error_id},
        )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(RequestBodySizeLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    )

    from app.api.v1 import auth, companies, signals, dashboard, watchlists, alerts, billing, pipelines, opportunities, contacts, settings as settings_router, admin

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(companies.router, prefix=settings.api_prefix)
    app.include_router(signals.router, prefix=settings.api_prefix)
    app.include_router(dashboard.router, prefix=settings.api_prefix)
    app.include_router(watchlists.router, prefix=settings.api_prefix)
    app.include_router(alerts.router, prefix=settings.api_prefix)
    app.include_router(billing.router, prefix=settings.api_prefix)
    app.include_router(pipelines.router, prefix=settings.api_prefix)
    app.include_router(opportunities.router, prefix=settings.api_prefix)
    app.include_router(contacts.router, prefix=settings.api_prefix)
    app.include_router(settings_router.router, prefix=settings.api_prefix)
    app.include_router(admin.router, prefix=settings.api_prefix)

    @app.get("/health")
    async def health():
        checks = {"db": "ok", "redis": "ok"}

        # Check DB
        try:
            from sqlalchemy import text
            from app.db.session import async_session_factory
            async with async_session_factory() as session:
                await session.execute(text("SELECT 1"))
        except Exception as e:
            logger.error("health_check_db_failed", error=str(e), exc_info=True)
            checks["db"] = "error"

        # Check Redis
        try:
            import redis
            if settings.redis_url:
                r = redis.from_url(settings.redis_url, socket_connect_timeout=2)
                r.ping()
            else:
                checks["redis"] = "not configured"
        except Exception as e:
            logger.error("health_check_redis_failed", error=str(e), exc_info=True)
            checks["redis"] = "error"

        healthy = all(v == "ok" for v in checks.values())
        return JSONResponse(
            status_code=200 if healthy else 503,
            content={"status": "ok" if healthy else "degraded", "checks": checks},
        )

    return app


app = create_app()
