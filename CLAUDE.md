# DispoSight

Subscription intelligence platform for ITAD/liquidation companies. Detects early signals of corporate distress (layoffs, bankruptcies, closures, M&A) and delivers actionable leads before competitors.

## Architecture

- **Backend**: Python + FastAPI (async)
- **Frontend**: Next.js 15 (App Router) + Tailwind + shadcn/ui
- **Database**: Supabase (PostgreSQL + Auth + RLS for multi-tenancy)
- **Background Jobs**: ARQ (async Redis queue)
- **AI/NLP**: Claude API (Haiku for volume, Sonnet for complex analysis)
- **Email**: Resend
- **Billing**: Stripe

## 4 Elite Pipelines

1. **WARN Act** — Structured layoff notices from data.gov + state sites
2. **GDELT** — News monitoring for closures, shutdowns, liquidation
3. **SEC EDGAR** — M&A and restructuring from 8-K filings
4. **CourtListener** — Chapter 7/11 bankruptcy filings

## Critical Filter

Every signal must answer: "Could this event produce 100+ surplus devices?" If no, discard.

## Running Locally

```bash
# Start Redis
docker-compose up -d redis

# Backend
cd backend && uv run uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Worker
cd backend && uv run arq app.workers.settings.WorkerSettings

# Database migrations
cd backend && uv run alembic upgrade head

# Tests
cd backend && uv run pytest
```

## Key Conventions

- Multi-tenancy via `tenant_id` column + Supabase RLS policies
- Companies and signals are global/shared; watchlists and alerts are tenant-scoped
- Base collector interface for all ingestion pipelines
- structlog for structured JSON logging throughout
- Dark mode default, Geist font, emerald accent
- Pydantic schemas for all request/response validation

## Current Build Status (as of 2026-02-08)

**All 15 implementation tasks COMPLETE.** Full app built using Ralphy method (small focused tasks, build one piece, test it, move to next).

### What's Built
- **Backend**: FastAPI with 21 routes, 10 SQLAlchemy ORM models, all loading
- **Frontend**: Next.js 16.1.6 with 13 pages, all compiling, dark theme with Geist font
- **Database**: 10 tables defined in `supabase/migrations/001_initial_schema.sql` (RLS, indexes, seed signal_sources)
- **4 Data Pipelines**: WARN Act, GDELT, SEC EDGAR, CourtListener (all in `backend/app/ingestion/`)
- **NLP Pipeline**: Entity extraction, signal classification, risk scoring, signal correlation, device filter (all in `backend/app/processing/`)
- **Email**: Resend integration with real-time alerts + daily/weekly digests (`backend/app/email/`)
- **Billing**: Stripe checkout, portal, webhooks (`backend/app/api/v1/billing.py`)
- **Tests**: 7/7 passing (`backend/tests/test_device_filter.py`)
- **Seed Data**: 8 companies, 10 signals (`supabase/seed.sql`)
- **Docker**: Dockerfile + docker-compose (Redis)

### What's NOT Done Yet
- **Supabase not connected** — `.mcp.json` created with project ref `yspgrbmthpmugqygobwu`, needs auth on next session restart
- **Database migration not applied** — Schema exists in SQL file but hasn't been run against Supabase
- **No git commits yet** — All code is uncommitted, remote set to `https://github.com/disposight/Disposight.git`
- **Map page is placeholder** — Leaflet + react-leaflet integration not done
- **No production deployment** — Fly.io (backend), Vercel (frontend), Upstash (Redis) not configured
- **API rate limiting** — CORS is set but no rate limiting middleware on endpoints
- **Frontend .env.local** — Has placeholder Supabase values, needs real keys from project `yspgrbmthpmugqygobwu`

### Next Steps (in priority order)
1. Connect Supabase MCP (restart session, authenticate)
2. Apply database migration to Supabase + seed data
3. Update `frontend/.env.local` with real Supabase URL/anon key
4. Test full auth flow (register → login → dashboard)
5. Git commit + push to `disposight/Disposight`
6. Live pipeline test (hit real APIs)
7. Map page with Leaflet
8. Production deployment

### GitHub
- Repo: `disposight/Disposight` (empty, remote added)
- Authenticated as: `ecosio1`

### Supabase
- Project ref: `yspgrbmthpmugqygobwu`
- Dashboard: `https://supabase.com/dashboard/project/yspgrbmthpmugqygobwu`

### Dev Server
- Frontend runs on `http://localhost:3000` (`cd frontend && npm run dev`)
- Backend needs Supabase DB connection to start
