from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

_REFRESH_TTL = settings.jwt_refresh_token_expire_days * 86_400


async def register(
    data: RegisterRequest, db: AsyncSession, redis: Redis
) -> tuple[User, str, str]:
    result = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already taken",
        )

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token, refresh_token = await _issue_tokens(user.id, redis)
    return user, access_token, refresh_token


async def login(
    data: LoginRequest, db: AsyncSession, redis: Redis
) -> tuple[User, str, str]:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token, refresh_token = await _issue_tokens(user.id, redis)
    return user, access_token, refresh_token


async def refresh_tokens(token: str, redis: Redis) -> tuple[str, str]:
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise ValueError
        jti: str = payload["jti"]
        user_id = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    stored = await redis.get(f"refresh:{jti}")
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or revoked",
        )

    # Rotate: revoke old token, issue new pair
    await redis.delete(f"refresh:{jti}")
    return await _issue_tokens(user_id, redis)


async def logout(token: str, redis: Redis) -> None:
    try:
        payload = decode_token(token)
        jti = payload.get("jti")
    except JWTError:
        return  # already invalid; nothing to revoke

    if jti:
        await redis.delete(f"refresh:{jti}")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _issue_tokens(user_id: UUID, redis: Redis) -> tuple[str, str]:
    access_token = create_access_token(user_id)
    refresh_token, jti = create_refresh_token(user_id)
    await redis.setex(f"refresh:{jti}", _REFRESH_TTL, str(user_id))
    return access_token, refresh_token
