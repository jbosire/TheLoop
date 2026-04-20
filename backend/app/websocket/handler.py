"""Routes incoming WebSocket messages to the appropriate handler."""
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import ConversationParticipant
from app.models.message import Message
from app.models.user import User
from app.websocket.events import ClientEvent, ServerEvent
from app.websocket.manager import manager


async def handle(event: dict, user_id: UUID, ws: WebSocket, db: AsyncSession) -> None:
    event_type = event.get("type")
    payload = event.get("payload", {})

    if event_type == ClientEvent.JOIN_CONVERSATION:
        await _handle_join(payload, user_id, ws, db)
    elif event_type == ClientEvent.SEND_MESSAGE:
        await _handle_send_message(payload, user_id, ws, db)
    else:
        await ws.send_json(
            {"type": ServerEvent.ERROR, "payload": {"code": "UNKNOWN_EVENT", "message": f"Unknown event type: {event_type}"}}
        )


async def _handle_join(payload: dict, user_id: UUID, ws: WebSocket, db: AsyncSession) -> None:
    from sqlalchemy import select

    conversation_id_raw = payload.get("conversation_id")
    if not conversation_id_raw:
        return

    try:
        conversation_id = UUID(str(conversation_id_raw))
    except ValueError:
        return

    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        await ws.send_json({
            "type": ServerEvent.ERROR,
            "payload": {"code": "INVALID_CONVERSATION", "message": "You are not a participant in this conversation"},
        })
        return

    manager.subscribe(user_id, conversation_id)


async def _handle_send_message(
    payload: dict, user_id: UUID, ws: WebSocket, db: AsyncSession
) -> None:
    from sqlalchemy import select

    conversation_id_raw = payload.get("conversation_id")
    client_msg_id_raw = payload.get("client_msg_id")
    content = payload.get("content", "").strip()
    content_type = payload.get("content_type", "text")

    if not conversation_id_raw or not client_msg_id_raw or not content:
        await ws.send_json({
            "type": ServerEvent.ERROR,
            "payload": {"code": "INVALID_PAYLOAD", "message": "conversation_id, client_msg_id, and content are required"},
        })
        return

    try:
        conversation_id = UUID(str(conversation_id_raw))
        client_msg_id = UUID(str(client_msg_id_raw))
    except ValueError:
        await ws.send_json({
            "type": ServerEvent.ERROR,
            "payload": {"code": "INVALID_PAYLOAD", "message": "Invalid UUID format"},
        })
        return

    # Verify membership
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        await ws.send_json({
            "type": ServerEvent.ERROR,
            "payload": {"code": "INVALID_CONVERSATION", "message": "You are not a participant in this conversation"},
        })
        return

    # Persist
    message = Message(
        client_msg_id=client_msg_id,
        conversation_id=conversation_id,
        sender_id=user_id,
        content_type=content_type,
        content=content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Fetch sender username for the broadcast payload
    sender_result = await db.execute(select(User).where(User.id == user_id))
    sender = sender_result.scalar_one()

    created_at_iso = message.created_at.isoformat()

    # ACK to sender
    await manager.send_to_user(user_id, {
        "type": ServerEvent.MESSAGE_ACK,
        "payload": {
            "client_msg_id": str(client_msg_id),
            "id": str(message.id),
            "created_at": created_at_iso,
            "status": "sent",
        },
    })

    # Broadcast to other conversation subscribers
    await manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": ServerEvent.NEW_MESSAGE,
            "payload": {
                "id": str(message.id),
                "client_msg_id": str(client_msg_id),
                "conversation_id": str(conversation_id),
                "sender_id": str(user_id),
                "sender_username": sender.username,
                "content_type": content_type,
                "content": content,
                "created_at": created_at_iso,
            },
        },
        exclude_sender=user_id,
    )
