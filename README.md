# FinScore AI — 5nance AI Financial Operating System

Monorepo. **Status: MVP 1 (platform foundation) implemented; MVP 2+ not started.** Design and plan: [`docs/`](docs/PHASE0_DESIGN_REVIEW.md).

```
backend/   FastAPI modular monolith (Python 3.12+), SQLAlchemy 2 async, Alembic, PostgreSQL
frontend/  Next.js 14 (App Router) + TypeScript + Tailwind, React Query, typed API client from OpenAPI
docs/      Architecture, decisions, rulebook, security, roadmap, tracker …
scripts/   dev helpers (embedded Postgres, OpenAPI export)
```

## Run with Docker (supported dev environment)
```bash
cp .env.example .env        # edit POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
```
Frontend http://localhost:3000 · API docs http://localhost:8000/docs · Mailpit (verification emails) http://localhost:8025

## Run without Docker (what was used to verify MVP 1 on this machine)
```bash
cd backend
uv venv --python 3.13 .venv && uv pip install --python .venv/Scripts/python.exe -e ".[dev]"
.venv/Scripts/python.exe ../scripts/dev_db.py start        # embedded PostgreSQL, prints DATABASE_URL
# create backend/.env (see .env.example; set MAIL_DIR=../.localdata/mail to read emails as files)
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:create_app --factory --port 8000
cd ../frontend && npm ci && npm run build && npx next start -p 3000
```

## Quality gates
```bash
cd backend  && ruff check app tests alembic && ruff format --check app tests alembic && mypy app && lint-imports && pytest
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
npm run gen:api        # after backend API changes: python scripts/export_openapi.py backend/openapi.json first
```

## Rules of the house
- The LLM never calculates money or scores; deterministic code in `backend/app/engines` does (import-linter enforces its purity).
- No official FinScore is shown until the Product Team approves the Rulebook (`docs/FINANCIAL_RULEBOOK.md`).
- No secrets in git. `.env` files are ignored; `.env.example` has placeholders only.
