import asyncio
import json
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    """Tracks active WebSocket connections and conversation subscriptions.

    Supports multiple simultaneous connections per user (e.g. multiple browser tabs).
    Redis pub/sub (app/utils/redis.py) extends this to multi-process deployments.
    """

    def __init__(self) -> None:
        # user_id → set of active WebSocket connections
        self._connections: dict[UUID, set[WebSocket]] = {}
        # conversation_id → set of subscribed user_ids
        self._subscriptions: dict[UUID, set[UUID]] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: UUID) -> None:
        sockets = self._connections.get(user_id, set())
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    def subscribe(self, user_id: UUID, conversation_id: UUID) -> None:
        self._subscriptions.setdefault(conversation_id, set()).add(user_id)

    async def broadcast_to_conversation(
        self,
        conversation_id: UUID,
        message: dict,
        exclude_sender: UUID | None = None,
    ) -> None:
        subscribers = self._subscriptions.get(conversation_id, set())
        tasks = []
        for uid in subscribers:
            if uid == exclude_sender:
                continue
            for ws in list(self._connections.get(uid, set())):
                tasks.append(_safe_send(ws, message))
        if tasks:
            await asyncio.gather(*tasks)

    async def send_to_user(self, user_id: UUID, message: dict) -> None:
        for ws in list(self._connections.get(user_id, set())):
            await _safe_send(ws, message)


manager = ConnectionManager()


async def _safe_send(ws: WebSocket, message: dict) -> None:
    try:
        await ws.send_text(json.dumps(message))
    except Exception:
        pass  # connection already closed; disconnect will be handled in the endpoint
