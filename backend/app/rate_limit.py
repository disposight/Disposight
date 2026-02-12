"""Rate limiting configuration using SlowAPI."""

import jwt
from jwt import PyJWKClient
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import settings

# Lazy-init JWKS client (same as deps.py)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and settings.supabase_url:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _key_func(request: Request) -> str:
    """Extract user ID from verified JWT for authenticated requests, fall back to client IP."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return get_remote_address(request)

    token = auth_header[7:]

    # Try ES256 via JWKS first (newer Supabase projects)
    jwks = _get_jwks_client()
    if jwks:
        try:
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass

    # Fallback to HS256 with JWT secret
    if settings.supabase_jwt_secret:
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
