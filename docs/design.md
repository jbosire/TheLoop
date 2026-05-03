# TheLoop — Design Document

## 1. Overview

**TheLoop** is a web-based real-time chat application supporting one-to-one and group conversations. The initial release focuses on text messaging with a clean, extensible architecture designed to accommodate future features (file sharing, voice/video, E2EE) without major refactoring.

### 1.1 Goals

- Real-time text messaging between users (1-to-1 and group)
- Reliable message delivery with optimistic UI
- Clean separation of concerns enabling future feature growth
- Simple, intuitive user experience

### 1.2 Non-Goals (Phase 1)

These are explicitly deferred but the architecture accounts for them:

- Image/file attachments (S3 integration planned)
- Voice/video calls
- End-to-end encryption
- Push notifications
- OAuth login (Google, GitHub)
- Read receipts and typing indicators
- Online/offline presence
- Message deletion
- Native mobile apps

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌──────────────────┐       HTTPS / WSS        ┌─────────────────────┐
│                  │ ◄──────────────────────►  │                     │
│   React + Vite   │                           │   FastAPI (ASGI)    │
│   (Browser)      │   REST: auth, history     │                     │
│                  │   WS: realtime messages   │   ┌───────────────┐ │
└──────────────────┘                           │   │ REST Routes   │ │
                                               │   │ WS Manager    │ │
                                               │   └───────┬───────┘ │
                                               │           │         │
                                               └───────────┼─────────┘
                                                           │
                                          ┌────────────────┼────────────────┐
                                          │                │                │
                                    ┌──────▼─────┐   ┌──────▼─────┐   ┌──────▼──────┐
                                    │ PostgreSQL │   │   Redis    │   │  S3 (future)│
                                    │            │   │            │   │             │
                                    │ Users      │   │ Pub/Sub    │   │ Attachments │
                                    │ Messages   │   │ Sessions   │   │ Media       │
                                    │ Convos     │   │            │   │             │
                                    └────────────┘   └────────────┘   └─────────────┘
```

### 2.2 Component Responsibilities

**React Frontend**
- Renders the chat UI (conversation list, message thread, compose area)
- Manages WebSocket connection lifecycle (connect, reconnect, backoff)
- Implements optimistic UI for message sending
- Calls REST endpoints for auth, conversation management, and message history

**FastAPI Backend**
- Serves REST API for authentication, user management, conversations, and message history
- Manages WebSocket connections and routes messages between participants
- Validates and persists messages to PostgreSQL
- Publishes/subscribes to Redis for multi-process message routing

**PostgreSQL**
- Persistent storage for users, conversations, participants, and messages
- Source of truth for all chat data

**Redis**
- Pub/sub channel for broadcasting messages across multiple server processes
- Session/token blacklist storage
- Future: presence tracking, typing indicator state

**S3-Compatible Storage (future)**
- File and image uploads
- Accessed via pre-signed URLs to keep the backend stateless for media serving

### 2.3 Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend framework | FastAPI | Native async, first-class WebSocket support, Pydantic validation |
| Frontend framework | React + Vite | Component model fits chat UI well; Vite for fast dev builds |
| Database | PostgreSQL | Relational model fits chat data; strong indexing for message queries |
| Realtime transport | Native WebSockets | No need for Socket.IO's overhead; FastAPI handles WS natively |
| ORM | SQLAlchemy 2.0 (async) | Mature, well-documented, async support via `asyncpg` |
| Migrations | Alembic | Standard companion to SQLAlchemy |
| Auth | JWT (access + refresh tokens) | Stateless auth; refresh flow supports token rotation |
| Password hashing | bcrypt via `passlib` | Industry standard |
| Pub/sub | Redis | Lightweight, fast; enables horizontal scaling of WS servers |

---

## 3. Data Model

### 3.1 Entity Relationship

```
users 1──────────M conversation_participants M──────────1 conversations
  │                                                          │
  │                                                          │
  └──────────1───────────M messages M────────────1───────────┘
```

### 3.2 Schema

#### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen | |
| first_name | VARCHAR(50) | NOT NULL | User's first name |
| last_name | VARCHAR(50) | NOT NULL | User's last name |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| avatar_url | VARCHAR(500) | NULLABLE | Profile picture URL |
| public_key | TEXT | NULLABLE | Future: E2EE public key |
| auth_provider | VARCHAR(20) | DEFAULT 'local' | Future: 'google', 'github' |
| auth_provider_id | VARCHAR(255) | NULLABLE | Future: OAuth provider user ID |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | Auto-updated |

#### `conversations`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen | |
| type | VARCHAR(10) | NOT NULL | 'direct' or 'group' |
| name | VARCHAR(100) | NULLABLE | Group name; null for direct |
| created_by | UUID | FK → users.id | Creator of the conversation |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now | |

#### `conversation_participants`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen | |
| conversation_id | UUID | FK → conversations.id | |
| user_id | UUID | FK → users.id | |
| role | VARCHAR(20) | DEFAULT 'member' | 'admin', 'member'; future: moderation |
| joined_at | TIMESTAMPTZ | NOT NULL, default now | |
| last_read_at | TIMESTAMPTZ | NULLABLE | Future: unread counts, read receipts |

**Unique constraint:** `(conversation_id, user_id)`

#### `messages`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen | Server-assigned ID |
| client_msg_id | UUID | NOT NULL | Client-generated; for dedup and optimistic UI |
| conversation_id | UUID | FK → conversations.id, NOT NULL | |
| sender_id | UUID | FK → users.id, NOT NULL | |
| content_type | VARCHAR(20) | DEFAULT 'text' | Future: 'image', 'file', 'audio', 'video', 'system' |
| content | TEXT | NOT NULL | Message body; future: JSON for rich content |
| metadata | JSONB | NULLABLE | Future: file URLs, dimensions, thumbnails, etc. |
| is_deleted | BOOLEAN | DEFAULT false | Future: soft delete |
| created_at | TIMESTAMPTZ | NOT NULL, default now | |

**Indexes:**
- `(conversation_id, created_at DESC)` — primary query pattern for loading message history
- `(client_msg_id)` — deduplication lookups
- `(sender_id, created_at DESC)` — future: user message search

### 3.3 Extensibility Notes

- **Attachments:** The `content_type` + `metadata` JSONB pattern avoids needing a separate attachments table for simple cases. When a user sends an image, `content_type` = `'image'` and `metadata` contains `{ "url": "...", "width": 800, "height": 600, "thumbnail_url": "..." }`. For complex attachment scenarios (multiple files per message), a separate `message_attachments` table can be added later without changing the messages table.
- **Message deletion:** The `is_deleted` flag enables soft deletes. The UI shows "This message was deleted" rather than removing the row.
- **E2EE:** The `public_key` field on users and the `content` field on messages are designed to hold encrypted payloads transparently — the server doesn't need to understand the content, just store and relay it.
- **OAuth:** The `auth_provider` and `auth_provider_id` columns are already present but unused in phase 1. Adding OAuth means populating these fields and adding an OAuth flow — no schema migration needed.
- **Reactions/replies:** Can be added as a `message_reactions` table and a `reply_to_id` FK on messages.

---

## 4. API Design

### 4.1 REST Endpoints

All endpoints return JSON. Auth-required endpoints expect `Authorization: Bearer <access_token>`.

#### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get access + refresh tokens |
| POST | `/api/auth/refresh` | Refresh token | Get new access + refresh tokens (rotation) |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |

**POST `/api/auth/register`**

Request:
```json
{
  "first_name": "Joram",
  "last_name": "Bosire",
  "username": "joram",
  "email": "joram@example.com",
  "password": "securepassword123"
}
```

Response (201):
```json
{
  "user": {
    "id": "uuid",
    "first_name": "Joram",
    "last_name": "Bosire",
    "username": "joram",
    "email": "joram@example.com",
    "avatar_url": null,
    "created_at": "2026-04-19T12:00:00Z"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

**POST `/api/auth/login`**

Request:
```json
{
  "email": "joram@example.com",
  "password": "securepassword123"
}
```

Response (200): Same shape as register response.

#### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update profile (username, avatar) |
| GET | `/api/users/search?q=term` | Yes | Search users by username/email |
| GET | `/api/users/:id` | Yes | Get user public profile |

#### Conversations

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/conversations` | Yes | Create conversation (direct or group) |
| GET | `/api/conversations` | Yes | List user's conversations |
| GET | `/api/conversations/:id` | Yes | Get conversation details + participants |
| PATCH | `/api/conversations/:id` | Yes | Update group name (admin only) |
| POST | `/api/conversations/:id/participants` | Yes | Add participant to group |
| DELETE | `/api/conversations/:id/participants/:user_id` | Yes | Remove participant / leave group |

**POST `/api/conversations`**

Request (direct):
```json
{
  "type": "direct",
  "participant_ids": ["other-user-uuid"]
}
```

Request (group):
```json
{
  "type": "group",
  "name": "Project Team",
  "participant_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Response (201):
```json
{
  "id": "conv-uuid",
  "type": "group",
  "name": "Project Team",
  "participants": [
    { "user_id": "uuid-1", "username": "alice", "role": "admin" },
    { "user_id": "uuid-2", "username": "bob", "role": "member" }
  ],
  "created_at": "2026-04-19T12:00:00Z"
}
```

**GET `/api/conversations`**

Response (200):
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "type": "direct",
      "name": null,
      "participants": [
        { "user_id": "uuid", "username": "alice", "role": "member" }
      ],
      "last_message": {
        "content": "Hey, how's it going?",
        "sender_id": "uuid",
        "created_at": "2026-04-19T12:00:00Z"
      }
    }
  ]
}
```

#### Messages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/conversations/:id/messages?cursor=&limit=50` | Yes | Paginated message history |

**GET `/api/conversations/:id/messages`**

Query params:
- `cursor` — ISO timestamp; returns messages before this time
- `limit` — max messages to return (default 50, max 100)

Response (200):
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "client_msg_id": "client-uuid",
      "sender_id": "user-uuid",
      "content_type": "text",
      "content": "Hello!",
      "metadata": null,
      "created_at": "2026-04-19T12:00:00Z"
    }
  ],
  "has_more": true,
  "next_cursor": "2026-04-19T11:50:00Z"
}
```

### 4.2 WebSocket Protocol

#### Connection

```
ws://localhost:8000/ws?token=<access_token>
```

The server validates the JWT during the WebSocket handshake. Invalid or expired tokens result in connection rejection (HTTP 401 before upgrade).

#### Message Format

All WebSocket messages are JSON with a `type` field:

```json
{
  "type": "event_name",
  "payload": {}
}
```

#### Client → Server Events

**`send_message`** — Send a new message
```json
{
  "type": "send_message",
  "payload": {
    "client_msg_id": "uuid-generated-by-client",
    "conversation_id": "conv-uuid",
    "content": "Hello everyone!",
    "content_type": "text"
  }
}
```

**`join_conversation`** — Subscribe to real-time updates for a conversation (sent on app load for each conversation, or when opening a conversation)
```json
{
  "type": "join_conversation",
  "payload": {
    "conversation_id": "conv-uuid"
  }
}
```

#### Server → Client Events

**`new_message`** — A new message in a conversation the user is part of
```json
{
  "type": "new_message",
  "payload": {
    "id": "server-uuid",
    "client_msg_id": "uuid-from-client",
    "conversation_id": "conv-uuid",
    "sender_id": "user-uuid",
    "sender_username": "alice",
    "content_type": "text",
    "content": "Hello everyone!",
    "created_at": "2026-04-19T12:00:00Z"
  }
}
```

**`message_ack`** — Server confirms receipt and persistence of a message (sent only to the sender)
```json
{
  "type": "message_ack",
  "payload": {
    "client_msg_id": "uuid-from-client",
    "id": "server-uuid",
    "created_at": "2026-04-19T12:00:00Z",
    "status": "sent"
  }
}
```

**`error`** — Something went wrong
```json
{
  "type": "error",
  "payload": {
    "code": "INVALID_CONVERSATION",
    "message": "You are not a participant in this conversation"
  }
}
```

#### Future WebSocket Events (designed for but not implemented in phase 1)

| Event | Direction | Purpose |
|---|---|---|
| `typing_start` | Client → Server | User started typing |
| `typing_stop` | Client → Server | User stopped typing |
| `typing_indicator` | Server → Client | Show typing indicator |
| `presence_update` | Server → Client | User online/offline status |
| `message_deleted` | Server → Client | Message was soft-deleted |
| `read_receipt` | Client → Server | User read messages up to timestamp |
| `read_update` | Server → Client | Participant read status changed |

### 4.3 Optimistic UI Flow

This is the core UX pattern for message sending. Getting it right makes the app feel instant.

```
1. User types message and hits send
2. Client generates a UUID (client_msg_id)
3. Client immediately renders the message in the thread with status "sending"
4. Client sends `send_message` event via WebSocket
5. Server validates, persists to Postgres, assigns server ID + timestamp
6. Server sends `message_ack` back to sender with server ID
7. Client matches ack to local message via client_msg_id
8. Client updates message status from "sending" to "sent", replaces local timestamp
9. Server broadcasts `new_message` to all other participants in the conversation
10. Other clients render the message immediately

Edge cases:
- If ack doesn't arrive within 5 seconds: show "failed to send" with retry button
- If client reconnects: re-fetch recent messages, deduplicate by client_msg_id
- If duplicate `new_message` arrives (e.g. after reconnect): skip if client_msg_id already exists locally
```

---

## 5. UI/UX Design

### 5.1 Page Structure

The app has three main views:

**Auth pages** — `/login`, `/register`
- Simple forms, nothing fancy
- Redirect to main app after successful auth

**Main chat view** — `/` (authenticated)
- Three-panel layout on desktop:
  - Left sidebar: conversation list + search + new conversation button
  - Center: active message thread with compose area at bottom
  - Right (collapsible): conversation details, participant list, settings
- On mobile-width browsers: single-panel with navigation between list and thread

**Settings/Profile** — `/settings`
- Profile editing (username, avatar)
- Future: notification preferences, E2EE key management

### 5.2 Screen Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────────────────────────────┐
│          │     │          │     │ Main Chat View                       │
│  Login   │────►│ Register │     │                                      │
│          │◄────│          │     │ ┌──────────┬────────────┬───────────┐ │
└────┬─────┘     └────┬─────┘     │ │ Sidebar  │  Thread    │  Details  │ │
     │                │           │ │          │            │ (toggle)  │ │
     └────────┬───────┘           │ │ [Search] │ Messages   │           │ │
              │                   │ │ Conv 1   │ ...        │ Members   │ │
              │  auth success     │ │ Conv 2 ← │ [Compose]  │ Settings  │ │
              └──────────────────►│ │ Conv 3   │            │           │ │
                                  │ └──────────┴────────────┴───────────┘ │
                                  └──────────────────────────────────────┘
```

### 5.3 Key UI Components

**ConversationList**
- Shows all conversations sorted by most recent message
- Each item: avatar/group icon, name, last message preview, timestamp, unread badge
- Search/filter bar at top
- "New conversation" button → opens user search modal

**MessageThread**
- Scrollable message list, newest at bottom
- Messages grouped by date ("Today", "Yesterday", "April 18")
- Each message: sender avatar, username, content, timestamp
- Own messages visually distinct (right-aligned or different color)
- Scroll-to-bottom button when scrolled up
- Infinite scroll upward for history (cursor-based pagination)

**ComposeArea**
- Text input with send button
- Future: attachment button, emoji picker
- Shift+Enter for newlines, Enter to send

**NewConversationModal**
- User search (by username or email)
- Select one user → create direct conversation
- Select multiple → prompted for group name → create group

### 5.4 Responsive Behavior

No native mobile apps, but the web UI should work well on mobile browsers:

- Below 768px: sidebar and thread become separate views with back navigation
- Touch-friendly tap targets (min 44px)
- No hover-dependent interactions on critical paths

---

## 6. Backend Architecture Detail

### 6.1 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, CORS, lifespan events
│   ├── config.py               # Settings via pydantic-settings
│   ├── database.py             # Async SQLAlchemy engine + session
│   ├── dependencies.py         # Dependency injection (get_db, get_current_user)
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── conversation.py
│   │   └── message.py
│   │
│   ├── schemas/                # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── conversation.py
│   │   └── message.py
│   │
│   ├── routers/                # REST route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── conversations.py
│   │   └── messages.py
│   │
│   ├── services/               # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── conversation_service.py
│   │   └── message_service.py
│   │
│   ├── websocket/              # WebSocket handling
│   │   ├── __init__.py
│   │   ├── manager.py          # ConnectionManager: tracks active connections
│   │   ├── handler.py          # Routes incoming WS messages to handlers
│   │   └── events.py           # Event type definitions
│   │
│   └── utils/
│       ├── __init__.py
│       ├── security.py         # JWT creation/validation, password hashing
│       └── redis.py            # Redis client + pub/sub helpers
│
├── alembic/                    # Database migrations
│   ├── alembic.ini
│   └── versions/
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_conversations.py
│   ├── test_messages.py
│   └── test_websocket.py
│
├── pyproject.toml              # Dependencies and project config
├── Dockerfile
└── .env.example
```

### 6.2 WebSocket Connection Manager

The `ConnectionManager` is the heart of the realtime system. It:

1. Tracks which WebSocket connections belong to which user
2. Tracks which conversations each connection is subscribed to
3. Routes messages to the correct connections
4. Handles disconnection cleanup

```python
# Conceptual structure (not final implementation)
from uuid import UUID
from fastapi import WebSocket

class ConnectionManager:
    # user_id → set of WebSocket connections (supports multiple tabs/devices)
    active_connections: dict[UUID, set[WebSocket]]

    # conversation_id → set of user_ids currently subscribed
    conversation_subscribers: dict[UUID, set[UUID]]

    async def connect(self, websocket: WebSocket, user_id: UUID): ...
    async def disconnect(self, websocket: WebSocket, user_id: UUID): ...
    async def subscribe(self, user_id: UUID, conversation_id: UUID): ...
    async def broadcast_to_conversation(self, conversation_id: UUID, message: dict, exclude_sender: UUID | None = None): ...
    async def send_to_user(self, user_id: UUID, message: dict): ...
```

### 6.3 Redis Pub/Sub (Multi-Process Scaling)

When running multiple FastAPI processes (e.g. behind a load balancer), a message sent to process A needs to reach users connected to process B. Redis pub/sub solves this:

```
User sends message → Process A persists to DB
                   → Process A publishes to Redis channel "conversation:{conv_id}"
                   → Process B (subscribed) receives and forwards to its local connections
```

This is wired in from the start even if you run a single process initially — it avoids a painful refactor later.

### 6.4 Authentication Flow

```
Register/Login → Server returns { access_token (15min), refresh_token (7 days) }
                → Client stores both (httpOnly cookie or memory)
                → REST requests: Authorization: Bearer <access_token>
                → WebSocket: ws://host/ws?token=<access_token>
                → On 401: client calls /auth/refresh with refresh_token
                → Server returns new access_token + new refresh_token (rotation)
                → Old refresh token is blacklisted in Redis
                → New refresh token has a fresh 7-day expiry
                → On refresh failure: redirect to login
```

Refresh tokens use **rotation**: every time a refresh token is used, the server issues a new one with a fresh 7-day expiry and blacklists the old one in Redis. This means active users stay logged in indefinitely — the 7-day window only applies to inactive users who haven't opened the app in a week. If a blacklisted refresh token is ever used (indicating theft), all refresh tokens for that user should be revoked as a security measure.

Access tokens are short-lived and stateless (no server-side tracking needed).

---

## 7. Frontend Architecture Detail

### 7.1 Project Structure

```
frontend/
├── src/
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Root component, routing
│   │
│   ├── api/                    # API client layer
│   │   ├── client.js           # Axios/fetch wrapper with auth interceptor
│   │   ├── auth.js             # Auth endpoints
│   │   ├── conversations.js    # Conversation endpoints
│   │   └── messages.js         # Message endpoints
│   │
│   ├── websocket/              # WebSocket client
│   │   ├── client.js           # Connection management, reconnect logic
│   │   └── events.js           # Event type constants (shared with backend)
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js          # Auth state + login/logout/register
│   │   ├── useWebSocket.js     # WS connection lifecycle
│   │   ├── useMessages.js      # Messages for active conversation
│   │   └── useConversations.js # Conversation list
│   │
│   ├── context/                # React context providers
│   │   ├── AuthContext.jsx     # Auth state provider
│   │   └── WebSocketContext.jsx # WS connection provider
│   │
│   ├── components/             # UI components
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   └── RegisterForm.jsx
│   │   ├── chat/
│   │   │   ├── ConversationList.jsx
│   │   │   ├── ConversationItem.jsx
│   │   │   ├── MessageThread.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── ComposeArea.jsx
│   │   │   └── ConversationDetails.jsx
│   │   ├── common/
│   │   │   ├── Avatar.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   └── layout/
│   │       └── ChatLayout.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ChatPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   └── utils/
│       ├── formatters.js       # Date formatting, message preview truncation
│       └── constants.js
│
├── public/
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

### 7.2 State Management

No Redux or Zustand needed for phase 1. React Context + hooks handle the state:

- **AuthContext** — current user, tokens, login/logout functions
- **WebSocketContext** — connection instance, connection status
- **Local state in hooks** — `useMessages` and `useConversations` manage their own state with `useState`/`useReducer`, updated by both REST responses and WebSocket events

If state complexity grows (presence, typing, reactions), consider adding Zustand — it's lightweight and avoids Redux boilerplate.

### 7.3 WebSocket Client

The client handles:

- **Connection:** Connects with JWT in query string; on auth failure, triggers token refresh and reconnects
- **Automatic reconnection:** Exponential backoff (1s → 2s → 4s → 8s → max 30s) with jitter
- **Event routing:** Incoming messages dispatched to the appropriate hook/context via callbacks
- **Heartbeat:** Periodic ping to detect dead connections (if the server doesn't respond within 10s, trigger reconnect)

### 7.4 Routing

```
/login          → LoginPage (public)
/register       → RegisterPage (public)
/               → ChatPage (protected, redirects to /login if unauthenticated)
/settings       → SettingsPage (protected)
```

Use `react-router-dom` with a `ProtectedRoute` wrapper that checks AuthContext.

---

## 8. Infrastructure & Development Setup

### 8.1 Local Development

**docker-compose.yml** runs Postgres and Redis. The FastAPI and React dev servers run on the host for hot-reloading:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: theloop
      POSTGRES_USER: theloop
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Backend dev server:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend dev server:**
```bash
cd frontend
npm install
npm run dev   # Vite dev server on port 5173
```

Vite proxies `/api` and `/ws` to the FastAPI backend (configured in `vite.config.js`) so you don't deal with CORS during development.

### 8.2 Environment Variables

**Backend `.env.example`:**
```env
DATABASE_URL=postgresql+asyncpg://theloop:localdev@localhost:5432/theloop
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=change-me-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
```

**Frontend `.env.example`:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### 8.3 Future Deployment Considerations

Not in scope for phase 1, but the architecture supports:
- **Containerization:** Dockerfile for both frontend (Nginx serving static build) and backend
- **Horizontal scaling:** Multiple FastAPI processes behind a load balancer; Redis pub/sub keeps them in sync
- **Managed services:** RDS for Postgres, ElastiCache for Redis, S3 for media, CloudFront for static assets
- **CI/CD:** GitHub Actions for linting, testing, building, deploying

---

## 9. Build Phases

### Phase 1: Foundation (current)
1. Project scaffolding (FastAPI + React + Docker Compose)
2. Database schema + Alembic migrations
3. Auth system (register, login, JWT, refresh)
4. Conversation CRUD (create direct/group, list, details)
5. Message history REST endpoint (cursor-based pagination)
6. WebSocket connection with auth
7. Real-time message sending and receiving
8. Optimistic UI with client_msg_id reconciliation
9. Basic UI: login, register, conversation list, message thread, compose

### Phase 2: Core Enhancements
- Online/offline presence (Redis-backed)
- Typing indicators
- Read receipts + unread counts
- Message deletion (soft delete)
- User search improvements

### Phase 3: Media & Files
- S3 integration for file/image uploads
- Pre-signed URL generation
- Image thumbnails and previews
- File type validation and size limits
- In-chat media rendering

### Phase 4: OAuth & Profile
- Google OAuth login
- GitHub OAuth login
- Profile picture upload
- Account settings

### Phase 5: Voice & Video
- Evaluate approach: WebRTC peer-to-peer vs SFU (mediasoup) vs third-party (Twilio/Agora)
- Signaling server integration
- 1-to-1 calls first, then group

### Phase 6: Security & Scale
- End-to-end encryption (evaluate Signal Protocol / Olm)
- Push notifications (web push API)
- Rate limiting
- Message search (full-text via Postgres or Elasticsearch)
- Performance optimization

---

## 10. Voice/Video Call Approaches (Reference)

Deferred to phase 5, but documented here for future decision-making.

| Approach | Pros | Cons | Best For |
|---|---|---|---|
| **WebRTC P2P** | Free, low latency, no server costs for media | NAT traversal issues, doesn't scale past 4-5 participants, need STUN/TURN servers | 1-to-1 calls, small groups |
| **SFU (mediasoup, Janus)** | Scales to large groups, server controls quality/routing, open source | Complex to deploy and maintain, need media servers with good bandwidth | Production group calls, full control |
| **Third-party (Twilio, Agora, Daily)** | Fast to integrate, handles infrastructure, good SDKs | Per-minute costs add up, vendor lock-in | Ship fast, don't want to manage media infra |

**Recommendation:** Start with WebRTC P2P for 1-to-1 calls (cheapest, simplest). If group calls become important, evaluate Twilio/Daily for speed or mediasoup for control. The signaling layer (exchanging SDP offers/answers and ICE candidates) runs through your existing WebSocket infrastructure regardless of which approach you choose.

---

## 11. Security Considerations

- **Passwords:** bcrypt with cost factor 12; never logged or returned in responses
- **JWT:** Short-lived access tokens (15min); refresh tokens rotated on every use — each refresh returns a new access token and a new refresh token with a fresh 7-day expiry, while the old refresh token is blacklisted in Redis. Active users stay logged in indefinitely; only users inactive for 7+ days must re-authenticate. Reuse of a blacklisted refresh token triggers revocation of all tokens for that user.
- **WebSocket auth:** Token validated on handshake; connection closed on expiry (client reconnects with refreshed token)
- **Input validation:** Pydantic schemas on all endpoints; message content sanitized before storage
- **CORS:** Restricted to frontend origin in production
- **SQL injection:** Mitigated by SQLAlchemy parameterized queries (never raw string interpolation)
- **Rate limiting:** Future phase; planned at both REST and WebSocket layers
- **File uploads (future):** Validated by type and size; stored in S3 with randomized keys; served via pre-signed URLs with short TTL
- **E2EE (future):** Server stores only ciphertext; key exchange and encryption happen entirely client-side