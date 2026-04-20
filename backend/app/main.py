import json
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError

from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import auth, conversations, messages, users
from app.utils.redis import close_redis, init_redis
from app.utils.security import decode_token
from app.websocket.handler import handle
from app.websocket.manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    await init_redis(settings.redis_url)
    yield
    await close_redis()


app = FastAPI(title="TheLoop API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(messages.router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str) -> None:
    # Authenticate before accepting the connection
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError
        user_id = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        async with AsyncSessionLocal() as db:
            while True:
                raw = await websocket.receive_text()
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"code": "INVALID_JSON", "message": "Message must be valid JSON"},
                    })
                    continue
                await handle(event, user_id, websocket, db)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, user_id)
