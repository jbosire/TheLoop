from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UpdateProfileRequest


async def get_by_id(user_id: UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def search(q: str, db: AsyncSession) -> list[User]:
    pattern = f"%{q}%"
    result = await db.execute(
        select(User)
        .where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
        .limit(20)
    )
    return list(result.scalars().all())


async def update_profile(
    user_id: UUID, data: UpdateProfileRequest, db: AsyncSession
) -> User:
    user = await get_by_id(user_id, db)

    if data.username is not None:
        existing = await db.execute(
            select(User).where(User.username == data.username, User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        user.username = data.username

    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    await db.commit()
    await db.refresh(user)
    return user
