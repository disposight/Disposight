from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Header
from jwt import PyJWKClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Cache the JWKS client (fetches public keys from Supabase)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


async def get_current_user_id(authorization: str = Header(default="")) -> UUID:
    """Extract user ID from Supabase JWT (supports both ES256 and HS256)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")

    try:
        # Try ES256 verification via JWKS first (newer Supabase projects)
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except Exception:
        try:
            # Fallback to HS256 with JWT secret (older Supabase projects)
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return UUID(user_id)


async def get_tenant_id(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UUID:
    """Look up tenant ID from the users table using the authenticated user ID."""
    from app.models import User

    user = await db.get(User, user_id)
    if not user or not user.tenant_id:
        raise HTTPException(status_code=403, detail="No tenant associated with user")
    return user.tenant_id


CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
TenantId = Annotated[UUID, Depends(get_tenant_id)]
