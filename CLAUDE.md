# DispoSight

Subscription intelligence platform for ITAD/liquidation companies. Detects early signals of corporate distress (layoffs, bankruptcies, closures, M&A) and delivers actionable leads before competitors.

## Architecture

- **Backend**: Python + FastAPI (async)
- **Frontend**: Next.js 15 (App Router) + Tailwind + shadcn/ui
- **Database**: Supabase (PostgreSQL + Auth + RLS for multi-tenancy)
- **Background Jobs**: ARQ (async Redis queue)
- **AI/NLP**: OpenAI API (gpt-4o-mini for volume, gpt-4o for complex analysis)
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

**All implementation tasks COMPLETE. App is fully functional with live data.**

### What's Built
- **Backend**: FastAPI with 21 routes, 10 SQLAlchemy ORM models, all loading
- **Frontend**: Next.js 16.1.6 with 14 pages (including Help), all compiling, dark theme with Geist font
- **Database**: 10 tables, 3 migrations applied to Supabase, RLS enabled on all tenant-scoped tables
- **4 Data Pipelines**: WARN Act, GDELT, SEC EDGAR, CourtListener — all tested against real APIs
- **NLP Pipeline**: OpenAI-powered (gpt-4o-mini) entity extraction, signal classification, risk scoring, signal correlation, device filter
- **Plan Gating**: Free users see upgrade wall; paid users see data. PlanProvider context at layout level, PlanGate wraps 7 data pages. Settings + Help remain accessible to free users.
- **Help Page**: `/dashboard/help` with 15-item FAQ accordion + 10-section How-to Guide, tabbed interface
- **Email**: Resend integration with real-time alerts + daily/weekly digests (`backend/app/email/`)
- **Billing**: Stripe checkout, portal, webhooks (`backend/app/api/v1/billing.py`)
- **Tests**: 7/7 passing (`backend/tests/test_device_filter.py`)
- **Docker**: Dockerfile + docker-compose (Redis)

### Live Data (as of 2026-02-08)
- **891 raw signals** ingested from real APIs
- **318 processed signals** (promoted through NLP pipeline)
- **233 companies** with risk scores and trends
- **583 signals discarded** (below 100-device threshold)
- Real companies: Amazon, Meta, Macy's, Wells Fargo, Thermo Fisher, Phillips 66, Constellation Brands, Nestle, etc.

### What's Done (completed this session)
- Supabase MCP connected and authenticated
- Database migration applied + seed data loaded
- Frontend `.env.local` has real Supabase URL/anon key
- Git repo has all code committed and pushed to `disposight/Disposight`
- All 4 pipelines tested against live APIs (WARN Act: 953 found, GDELT: 3, SEC EDGAR: 50, CourtListener: 14)
- NLP pipeline switched from Anthropic to OpenAI (gpt-4o-mini)
- 255 raw signals processed through OpenAI NLP pipeline
- Help page with FAQ + How-to Guide
- Free/paid plan gating (PlanGate component)
- Vercel MCP server added (needs auth on next session restart)

### What's NOT Done Yet
- **Vercel deployment** — MCP added, needs OAuth auth on session restart, then deploy frontend
- **Backend deployment** — Fly.io not configured (user only has Vercel account currently)
- **Redis (Upstash)** — Not configured (needed for ARQ background workers in production)
- **API rate limiting** — CORS is set but no rate limiting middleware
- **Stripe keys** — `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` not set in `.env`
- **Resend key** — `RESEND_API_KEY` not set in `.env`
- **Auth flow test** — Manual test needed (register → login → dashboard)

### Next Steps (in priority order)
1. Authenticate Vercel MCP (restart session, OAuth)
2. Deploy frontend to Vercel (set env vars, deploy)
3. Set up Fly.io account + deploy backend
4. Set up Upstash Redis for production workers
5. Set Stripe + Resend API keys
6. Test full auth flow end-to-end
7. API rate limiting

### GitHub
- Repo: `disposight/Disposight`
- Branch: `main`
- Latest commit: `5cf948a` (Switch NLP pipeline from Anthropic to OpenAI)
- Authenticated as: `ecosio1`

### Supabase
- Project ref: `yspgrbmthpmugqygobwu`
- Dashboard: `https://supabase.com/dashboard/project/yspgrbmthpmugqygobwu`
- All 10 tables created, RLS enabled, 3 migrations applied

### MCP Servers
- **Supabase**: Connected and authenticated
- **GitHub**: Connected and authenticated
- **Vercel**: Added, needs OAuth on next session restart

### Dev Server
- Frontend: `http://localhost:3000` (`cd frontend && npm run dev`)
- Backend: `http://localhost:8000` (`cd backend && uv run uvicorn app.main:app --reload`)

### Key Files for Plan Gating
- `frontend/src/contexts/plan-context.tsx` — PlanProvider (fetches user plan once)
- `frontend/src/components/dashboard/plan-gate.tsx` — Upgrade wall for free users
- `frontend/src/app/dashboard/layout.tsx` — Wraps children in PlanProvider
- Gated pages: Overview, Signals, Companies, Company detail, Map, Watchlist, Alerts
- Ungated pages: Settings, Help

### LLM Client
- `backend/app/processing/llm_client.py` — OpenAI-powered, model map: "haiku" → gpt-4o-mini, "sonnet" → gpt-4o
- Only 2 files call LLM: `entity_extractor.py` and `signal_classifier.py` (both use "haiku" alias)
