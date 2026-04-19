# TheLoop

A real-time chat application for one-to-one and group conversations, built with FastAPI and React.

## What It Does

TheLoop lets users create accounts, start conversations with other users, and exchange messages in real time. Messages are delivered instantly via WebSockets and persisted to a PostgreSQL database for full history.

### Current Features (Phase 1)

- Email/password registration and login
- One-to-one direct conversations
- Group conversations with multiple participants
- Real-time text messaging via WebSockets
- Message history with infinite scroll
- Optimistic message sending (messages appear instantly, confirmed by server)

### Planned Features

- Image and file sharing
- Message deletion
- Online/offline presence indicators
- Typing indicators and read receipts
- OAuth login (Google, GitHub)
- Voice and video calls
- End-to-end encryption
- Push notifications

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | FastAPI (Python) |
| Database | PostgreSQL 16 |
| Cache / Pub-Sub | Redis 7 |
| Auth | JWT (access + refresh tokens) |
| Realtime | WebSockets (native) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose

### 1. Clone the repository

```bash
git clone git@github.com:jbosire/TheLoop.git
cd TheLoop
```

### 2. Start Postgres and Redis

```bash
docker compose up -d
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
cp .env.example .env          # Edit .env with your local settings
pip install -e ".[dev]"
alembic upgrade head          # Run database migrations
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Set up the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
TheLoop/
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── routers/        # REST API route handlers
│   │   ├── services/       # Business logic
│   │   ├── websocket/      # WebSocket connection manager and handlers
│   │   └── utils/          # Auth, security, Redis helpers
│   ├── alembic/            # Database migrations
│   └── tests/
├── frontend/               # React + Vite application
│   └── src/
│       ├── api/            # REST API client
│       ├── websocket/      # WebSocket client with reconnection
│       ├── hooks/          # Custom React hooks
│       ├── context/        # Auth and WebSocket providers
│       ├── components/     # UI components
│       └── pages/          # Page-level components
├── docs/
│   └── design.md           # Architecture and design document
└── docker-compose.yml      # Local development infrastructure
```

## Documentation

See [`docs/design.md`](docs/design.md) for the full design document covering architecture, data model, API contracts, WebSocket protocol, UI/UX design, and the phased build plan.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
