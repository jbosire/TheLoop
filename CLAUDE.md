# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

TheLoop is a real-time web-based chat application supporting 1-to-1 and group conversations. Currently in phase 1: text messaging with email/password auth.

## Stack

- **Frontend:** React + Vite (JavaScript)
- **Backend:** FastAPI (Python, async)
- **Database:** PostgreSQL 16 (via SQLAlchemy 2.0 async + asyncpg)
- **Migrations:** Alembic
- **Cache/Pub-Sub:** Redis 7
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **Realtime:** Native WebSockets (not Socket.IO)

## Repository Structure

```
TheLoop/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py       # FastAPI app entry point
│   │   ├── config.py     # pydantic-settings config
│   │   ├── database.py   # Async SQLAlchemy engine + session
│   │   ├── dependencies.py
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── routers/      # REST route handlers
│   │   ├── services/     # Business logic layer
│   │   ├── websocket/    # ConnectionManager, WS handlers, events
│   │   └── utils/        # JWT, password hashing, Redis helpers
│   ├── alembic/          # Database migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/             # React + Vite application
│   ├── src/
│   │   ├── api/          # REST API client layer
│   │   ├── websocket/    # WebSocket client + reconnect logic
│   │   ├── hooks/        # Custom React hooks (useAuth, useMessages, etc.)
│   │   ├── context/      # AuthContext, WebSocketContext
│   │   ├── components/   # UI components (auth/, chat/, common/, layout/)
│   │   ├── pages/        # LoginPage, RegisterPage, ChatPage, SettingsPage
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── design.md         # Full architecture and design document
├── docker-compose.yml    # Postgres + Redis for local dev
├── CLAUDE.md
└── README.md
```

## Commands

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head              # Run migrations
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                       # Vite dev server on port 5173
```

### Infrastructure
```bash
docker compose up -d              # Start Postgres + Redis
docker compose down               # Stop services
```

## Key Conventions

- Use `async/await` throughout the backend. All database queries use async SQLAlchemy sessions.
- Pydantic schemas for all request/response validation. Keep schemas in `schemas/`, ORM models in `models/`.
- Business logic lives in `services/`, not in route handlers. Routers are thin.
- WebSocket events use JSON with a `type` field: `{"type": "event_name", "payload": {...}}`.
- Messages use client-generated UUIDs (`client_msg_id`) for deduplication and optimistic UI reconciliation.
- Cursor-based pagination for message history (`WHERE created_at < $cursor LIMIT 50`), never offset-based.
- Frontend state management: React Context + hooks. No Redux/Zustand unless complexity demands it.
- Frontend routing via react-router-dom with a ProtectedRoute wrapper for auth.
- Vite proxies `/api` and `/ws` to the backend during development.

## Environment Variables

Backend reads from `.env` (never committed). See `.env.example` for required keys:
`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS`

Frontend uses `VITE_API_BASE_URL` and `VITE_WS_URL` from `.env`.

## Design Reference

For full architecture details, data model, API contracts, WebSocket protocol, UI/UX flows, and phased build plan, see `docs/design.md`.
