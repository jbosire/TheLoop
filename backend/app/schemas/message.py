from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MessageResponse(BaseModel):
    id: UUID
    client_msg_id: UUID
    sender_id: UUID
    content_type: str
    content: str
    metadata: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_message(cls, msg: object) -> "MessageResponse":
        return cls(
            id=msg.id,  # type: ignore[attr-defined]
            client_msg_id=msg.client_msg_id,  # type: ignore[attr-defined]
            sender_id=msg.sender_id,  # type: ignore[attr-defined]
            content_type=msg.content_type,  # type: ignore[attr-defined]
            content=msg.content,  # type: ignore[attr-defined]
            metadata=msg.extra,  # type: ignore[attr-defined]
            created_at=msg.created_at,  # type: ignore[attr-defined]
        )


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool
    next_cursor: str | None
