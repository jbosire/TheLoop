from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, model_validator


class CreateConversationRequest(BaseModel):
    type: Literal["direct", "group"]
    name: str | None = None
    participant_ids: list[UUID]

    @model_validator(mode="after")
    def validate_for_type(self) -> "CreateConversationRequest":
        if self.type == "direct" and len(self.participant_ids) != 1:
            raise ValueError("A direct conversation requires exactly one other participant")
        if self.type == "group" and not self.name:
            raise ValueError("Group conversations require a name")
        if self.type == "group" and len(self.participant_ids) < 1:
            raise ValueError("A group conversation requires at least one other participant")
        return self


class UpdateConversationRequest(BaseModel):
    name: str


class AddParticipantRequest(BaseModel):
    user_id: UUID


class ParticipantResponse(BaseModel):
    user_id: UUID
    username: str
    role: str

    model_config = {"from_attributes": True}


class LastMessageResponse(BaseModel):
    content: str
    sender_id: UUID
    created_at: datetime


class ConversationResponse(BaseModel):
    id: UUID
    type: str
    name: str | None
    participants: list[ParticipantResponse]
    created_at: datetime


class ConversationListItem(BaseModel):
    id: UUID
    type: str
    name: str | None
    participants: list[ParticipantResponse]
    last_message: LastMessageResponse | None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationListItem]
