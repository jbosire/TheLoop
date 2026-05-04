from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, ConversationParticipant
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import (
    ConversationListItem,
    CreateConversationRequest,
    LastMessageResponse,
    ParticipantResponse,
    UpdateConversationRequest,
)


async def create(
    data: CreateConversationRequest, current_user_id: UUID, db: AsyncSession
) -> Conversation:
    # Verify all requested participants exist
    all_participant_ids = list({current_user_id, *data.participant_ids})
    result = await db.execute(select(User).where(User.id.in_(all_participant_ids)))
    found = {u.id for u in result.scalars().all()}
    missing = set(all_participant_ids) - found
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more users not found")

    if data.type == "direct":
        other_id = data.participant_ids[0]
        existing = await _find_direct_conversation(current_user_id, other_id, db)
        if existing:
            return existing

    conversation = Conversation(
        type=data.type,
        name=data.name,
        created_by=current_user_id,
    )
    db.add(conversation)
    await db.flush()  # get conversation.id before adding participants

    creator_role = "admin" if data.type == "group" else "member"
    db.add(ConversationParticipant(
        conversation_id=conversation.id,
        user_id=current_user_id,
        role=creator_role,
    ))
    for uid in data.participant_ids:
        db.add(ConversationParticipant(
            conversation_id=conversation.id,
            user_id=uid,
            role="member",
        ))

    await db.commit()
    await db.refresh(conversation)
    return conversation


async def list_for_user(user_id: UUID, db: AsyncSession) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(ConversationParticipant.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().unique().all())


async def list_with_last_message(user_id: UUID, db: AsyncSession) -> list[ConversationListItem]:
    conversations = await list_for_user(user_id, db)
    items = []
    for conv in conversations:
        row = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id, Message.is_deleted.is_(False))
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = row.scalar_one_or_none()
        items.append(
            ConversationListItem(
                id=conv.id,
                type=conv.type,
                name=conv.name,
                participants=[ParticipantResponse.from_model(p) for p in conv.participants],
                last_message=(
                    LastMessageResponse(
                        content=last_msg.content,
                        sender_id=last_msg.sender_id,
                        created_at=last_msg.created_at,
                    )
                    if last_msg
                    else None
                ),
            )
        )
    return items


async def get(conversation_id: UUID, user_id: UUID, db: AsyncSession) -> Conversation:
    conversation = await _get_or_404(conversation_id, db)
    _assert_participant(conversation, user_id)
    return conversation


async def update_name(
    conversation_id: UUID,
    data: UpdateConversationRequest,
    user_id: UUID,
    db: AsyncSession,
) -> Conversation:
    conversation = await _get_or_404(conversation_id, db)
    _assert_participant(conversation, user_id, require_admin=True)

    if conversation.type != "group":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only group conversations have a name",
        )

    conversation.name = data.name
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def add_participant(
    conversation_id: UUID, target_user_id: UUID, requester_id: UUID, db: AsyncSession
) -> Conversation:
    conversation = await _get_or_404(conversation_id, db)
    _assert_participant(conversation, requester_id, require_admin=True)

    if conversation.type != "group":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add participants to a direct conversation",
        )

    already = any(p.user_id == target_user_id for p in conversation.participants)
    if already:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a participant")

    user_exists = await db.execute(select(User).where(User.id == target_user_id))
    if not user_exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.add(ConversationParticipant(
        conversation_id=conversation_id,
        user_id=target_user_id,
        role="member",
    ))
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def remove_participant(
    conversation_id: UUID, target_user_id: UUID, requester_id: UUID, db: AsyncSession
) -> None:
    conversation = await _get_or_404(conversation_id, db)
    _assert_participant(conversation, requester_id)

    # Admins can remove anyone; members can only leave themselves
    if requester_id != target_user_id:
        _assert_participant(conversation, requester_id, require_admin=True)

    participant = next(
        (p for p in conversation.participants if p.user_id == target_user_id), None
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    await db.delete(participant)
    await db.commit()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_or_404(conversation_id: UUID, db: AsyncSession) -> Conversation:
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


def _assert_participant(
    conversation: Conversation, user_id: UUID, require_admin: bool = False
) -> None:
    participant = next(
        (p for p in conversation.participants if p.user_id == user_id), None
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")
    if require_admin and participant.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


async def _find_direct_conversation(
    user_a: UUID, user_b: UUID, db: AsyncSession
) -> Conversation | None:
    # A direct conversation shared by both users
    result = await db.execute(
        select(Conversation)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(
            Conversation.type == "direct",
            ConversationParticipant.user_id == user_a,
            Conversation.id.in_(
                select(ConversationParticipant.conversation_id).where(
                    ConversationParticipant.user_id == user_b
                )
            ),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()
