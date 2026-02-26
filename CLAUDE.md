# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Group Meet App — a monorepo with a **React (Vite)** frontend and **Python (FastAPI)** backend, using **MongoDB Atlas** as the database. The app helps university students find and form project groups.

## Commands

### Frontend (run from `frontend/`)
- `npm install` — install dependencies
- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build
- `npm run lint` — ESLint + Prettier check (this is what CI runs)

### Backend (run from `backend/`)
- `python3 -m venv .venv && source .venv/bin/activate` — create/activate venv
- `pip install -r requirements.txt` — install dependencies
- `uvicorn app.app:app --reload` — start FastAPI dev server
- `ruff check .` — lint Python code
- `ruff format --check .` — check Python formatting
- `ruff format .` — auto-format Python code
- `pytest` — run tests (test files are in `backend/tests/`)

## Architecture

**Backend** (`backend/app/`):
- `app.py` — FastAPI app entry point; registers routers with `/api` prefix
- `db/connect.py` — MongoDB Atlas connection via pymongo; reads `DB_USER` and `DB_PASS` from `.env`
- `routers/` — API endpoint modules (e.g., `users.py`); each exports an `APIRouter`
- `models/schemas.py` — Pydantic models following a Base/Create/Read pattern (e.g., `UserBase` → `UserCreate` → `UserRead`). Uses `PyObjectId` for MongoDB ObjectId handling.
- `models/enums.py` — shared enums (`Major`, `SkillLevel`)
- `core/` — business logic and algorithms (e.g., matching engine)

**Frontend** (`frontend/src/`):
- `components/` — reusable UI components
- `pages/` — full page views
- `api/` — API connection logic

## Linting & Formatting

- **Python**: Ruff (line-length 88, Python 3.10+, double quotes). Config in `backend/pyproject.toml`.
- **JavaScript/JSX**: ESLint + Prettier (4-space indent, single quotes, semicolons, 100 print width). Configs in `frontend/eslint.config.js` and `frontend/.prettierrc`.

## CI

GitHub Actions run on PRs and pushes to `main`:
- `backend.yml` — runs `ruff check .` and `ruff format --check .`
- `frontend.yml` — runs `npm run lint`

## Key Tech Decisions

- **Auth:** JWT (stateless) in httpOnly cookies. `python-jose` for tokens, `passlib[bcrypt]` for passwords. UNT-only enforced by validating `@my.unt.edu` email at registration.
- **Messaging:** REST-based (no WebSockets). Chat uses standard endpoints; frontend can short-poll (~5s) for near-real-time. DMs are unified with group chats — a DM is a `Group` with `isDirect: true` and 2 members.
- **Matching:** Jaccard similarity on user `skills` + `courses` arrays. Lives in `backend/app/core/`.
- **Hosting:** Vercel for frontend, Railway or Render for backend. MongoDB Atlas already cloud-hosted.

## Environment

Backend requires a `backend/.env` file with `DB_USER` and `DB_PASS` for MongoDB Atlas connection.
