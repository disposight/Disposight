"""Rate limiting configuration using SlowAPI."""

import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import settings


def _key_func(request: Request) -> str:
    """Extract user ID from verified JWT for authenticated requests, fall back to client IP."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer ") and settings.supabase_jwt_secret:
        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)


def _get_storage_uri() -> str | None:
    """Return Redis URI if available, else use in-memory (no rate limiting persistence)."""
    if not settings.redis_url:
        return "memory://"
    try:
        import redis
        r = redis.from_url(settings.redis_url, socket_connect_timeout=1)
        r.ping()
        return settings.redis_url
    except Exception:
        return "memory://"


limiter = Limiter(
    key_func=_key_func,
    storage_uri=_get_storage_uri(),
    default_limits=[],
)
