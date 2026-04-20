from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import ConversationParticipant
from app.models.message import Message

_MAX_LIMIT = 100
_DEFAULT_LIMIT = 50


async def get_history(
    conversation_id: UUID,
    user_id: UUID,
    db: AsyncSession,
    cursor: datetime | None = None,
    limit: int = _DEFAULT_LIMIT,
) -> tuple[list[Message], bool]:
    """Returns (messages, has_more). Messages are ordered newest-first."""
    await _assert_participant(conversation_id, user_id, db)

    limit = min(limit, _MAX_LIMIT)
    query = (
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.is_deleted.is_(False),
        )
        .order_by(Message.created_at.desc())
        .limit(limit + 1)
    )
    if cursor:
        query = query.where(Message.created_at < cursor)

    result = await db.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    return rows[:limit], has_more


async def _assert_participant(
    conversation_id: UUID, user_id: UUID, db: AsyncSession
) -> None:
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")
