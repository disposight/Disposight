import uuid

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

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)


logger = structlog.get_logger()


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
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.v1 import auth, companies, signals, dashboard, watchlists, alerts, billing, pipelines, opportunities, settings as settings_router

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(companies.router, prefix=settings.api_prefix)
    app.include_router(signals.router, prefix=settings.api_prefix)
    app.include_router(dashboard.router, prefix=settings.api_prefix)
    app.include_router(watchlists.router, prefix=settings.api_prefix)
    app.include_router(alerts.router, prefix=settings.api_prefix)
    app.include_router(billing.router, prefix=settings.api_prefix)
    app.include_router(pipelines.router, prefix=settings.api_prefix)
    app.include_router(opportunities.router, prefix=settings.api_prefix)
    app.include_router(settings_router.router, prefix=settings.api_prefix)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
