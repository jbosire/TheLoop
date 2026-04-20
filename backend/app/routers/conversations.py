from uuid import UUID

from fastapi import APIRouter

from app.dependencies import CurrentUserDep, DBDep
from app.schemas.conversation import (
    AddParticipantRequest,
    ConversationListResponse,
    ConversationResponse,
    CreateConversationRequest,
    ParticipantResponse,
    UpdateConversationRequest,
)
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _participant_response(p) -> ParticipantResponse:  # type: ignore[no-untyped-def]
    return ParticipantResponse(user_id=p.user_id, username=p.user.username, role=p.role)


def _to_response(conv) -> ConversationResponse:  # type: ignore[no-untyped-def]
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        participants=[_participant_response(p) for p in conv.participants],
        created_at=conv.created_at,
    )


@router.post("", status_code=201, response_model=ConversationResponse)
async def create_conversation(
    data: CreateConversationRequest, user_id: CurrentUserDep, db: DBDep
) -> ConversationResponse:
    conv = await conversation_service.create(data, user_id, db)
    return _to_response(conv)


@router.get("", response_model=ConversationListResponse)
async def list_conversations(user_id: CurrentUserDep, db: DBDep) -> ConversationListResponse:
    from app.models.message import Message
    from sqlalchemy import select

    conversations = await conversation_service.list_for_user(user_id, db)

    items = []
    for conv in conversations:
        last_msg_row = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id, Message.is_deleted.is_(False))
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_row.scalar_one_or_none()
        from app.schemas.conversation import ConversationListItem, LastMessageResponse

        items.append(
            ConversationListItem(
                id=conv.id,
                type=conv.type,
                name=conv.name,
                participants=[_participant_response(p) for p in conv.participants],
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

    return ConversationListResponse(conversations=items)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID, user_id: CurrentUserDep, db: DBDep
) -> ConversationResponse:
    conv = await conversation_service.get(conversation_id, user_id, db)
    return _to_response(conv)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    data: UpdateConversationRequest,
    user_id: CurrentUserDep,
    db: DBDep,
) -> ConversationResponse:
    conv = await conversation_service.update_name(conversation_id, data, user_id, db)
    return _to_response(conv)


@router.post("/{conversation_id}/participants", response_model=ConversationResponse)
async def add_participant(
    conversation_id: UUID,
    data: AddParticipantRequest,
    user_id: CurrentUserDep,
    db: DBDep,
) -> ConversationResponse:
    conv = await conversation_service.add_participant(conversation_id, data.user_id, user_id, db)
    return _to_response(conv)


@router.delete("/{conversation_id}/participants/{target_user_id}", status_code=204)
async def remove_participant(
    conversation_id: UUID,
    target_user_id: UUID,
    user_id: CurrentUserDep,
    db: DBDep,
) -> None:
    await conversation_service.remove_participant(conversation_id, target_user_id, user_id, db)
