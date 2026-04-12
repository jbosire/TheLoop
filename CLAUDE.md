# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheLoop is a monorepo full-stack web application with a React frontend and a Python or Node.js backend, containerized with Docker.

## Repository Structure

```
TheLoop/
├── backend/          # Backend service (Python or Node.js — not yet scaffolded)
├── frontend/         # React frontend (not yet scaffolded)
└── docker-compose.yml
```

## Commands

This project is in early scaffolding. Commands will be added here once the frontend and backend are initialized. Expected patterns:

- **Frontend** (once created): `npm install`, `npm run dev`, `npm test`, `npm run lint`
- **Backend** (once created): depends on chosen framework (Flask/Django/Express)
- **Docker**: `docker compose up` to run all services

## Architecture Notes

- Monorepo: frontend and backend are separate directories, each with their own dependencies and build pipelines.
- Docker Compose will orchestrate local development across services.
- Update this file with actual commands, ports, and service names once `docker-compose.yml` and the package manifests are populated.
