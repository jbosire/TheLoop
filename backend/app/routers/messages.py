from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies import CurrentUserDep, DBDep
from app.schemas.message import MessageListResponse, MessageResponse
from app.services import message_service

router = APIRouter(tags=["messages"])


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: UUID,
    user_id: CurrentUserDep,
    db: DBDep,
    cursor: datetime | None = Query(default=None, description="ISO timestamp; return messages before this time"),
    limit: int = Query(default=50, ge=1, le=100),
) -> MessageListResponse:
    messages, has_more = await message_service.get_history(
        conversation_id, user_id, db, cursor=cursor, limit=limit
    )
    return MessageListResponse(
        messages=[MessageResponse.from_orm_message(m) for m in messages],
        has_more=has_more,
        next_cursor=messages[-1].created_at.isoformat() if has_more and messages else None,
    )
