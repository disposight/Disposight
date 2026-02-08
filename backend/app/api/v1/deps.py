from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Header
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user_id(authorization: str = Header(...)) -> UUID:
    """Extract user ID from Supabase JWT."""
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return UUID(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_tenant_id(authorization: str = Header(...)) -> UUID:
    """Extract tenant ID from Supabase JWT custom claims."""
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            # Fallback: look up tenant from user
            raise HTTPException(status_code=401, detail="No tenant in token")
        return UUID(tenant_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
TenantId = Annotated[UUID, Depends(get_tenant_id)]
