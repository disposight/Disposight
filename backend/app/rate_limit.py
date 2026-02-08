"""Rate limiting configuration using SlowAPI."""

import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import settings


def _key_func(request: Request) -> str:
    """Extract user ID from JWT for authenticated requests, fall back to client IP."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(
    key_func=_key_func,
    storage_uri=settings.redis_url,
    default_limits=[],
)
