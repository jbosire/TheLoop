from uuid import UUID

from fastapi import APIRouter

from app.dependencies import CurrentUserDep, DBDep
from app.schemas.conversation import (
    AddParticipantRequest,
    ConversationListResponse,
    ConversationResponse,
    CreateConversationRequest,
    UpdateConversationRequest,
)
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", status_code=201, response_model=ConversationResponse)
async def create_conversation(
    data: CreateConversationRequest, user_id: CurrentUserDep, db: DBDep
) -> ConversationResponse:
    conv = await conversation_service.create(data, user_id, db)
    return ConversationResponse.from_model(conv)


@router.get("", response_model=ConversationListResponse)
async def list_conversations(user_id: CurrentUserDep, db: DBDep) -> ConversationListResponse:
    items = await conversation_service.list_with_last_message(user_id, db)
    return ConversationListResponse(conversations=items)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID, user_id: CurrentUserDep, db: DBDep
) -> ConversationResponse:
    conv = await conversation_service.get(conversation_id, user_id, db)
    return ConversationResponse.from_model(conv)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    data: UpdateConversationRequest,
    user_id: CurrentUserDep,
    db: DBDep,
) -> ConversationResponse:
    conv = await conversation_service.update_name(conversation_id, data, user_id, db)
    return ConversationResponse.from_model(conv)


@router.post("/{conversation_id}/participants", response_model=ConversationResponse)
async def add_participant(
    conversation_id: UUID,
    data: AddParticipantRequest,
    user_id: CurrentUserDep,
    db: DBDep,
) -> ConversationResponse:
    conv = await conversation_service.add_participant(conversation_id, data.user_id, user_id, db)
    return ConversationResponse.from_model(conv)


@router.delete("/{conversation_id}/participants/{target_user_id}", status_code=204)
async def remove_participant(
    conversation_id: UUID,
    target_user_id: UUID,
    user_id: CurrentUserDep,
    db: DBDep,
) -> None:
    await conversation_service.remove_participant(conversation_id, target_user_id, user_id, db)
