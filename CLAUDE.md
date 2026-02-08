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

**Fully deployed. App is live with real data.**

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
- **Rate Limiting**: SlowAPI with Redis backend, per-user (JWT) or per-IP keying (`backend/app/rate_limit.py`)
- **Tests**: 7/7 passing (`backend/tests/test_device_filter.py`)
- **Docker**: Dockerfile + docker-compose (Redis)

### Rate Limit Tiers
| Tier | Limit | Endpoints |
|------|-------|-----------|
| Auth | 10/min | `/auth/callback`, `/auth/me` |
| Billing | 5/min | `/billing/checkout`, `/billing/portal` |
| Webhook | 60/min | `/billing/webhook` |
| Read | 60/min | `/signals`, `/companies`, `/dashboard`, `/watchlists`, `/alerts`, `/pipelines/new-signals` |
| Write | 20/min | POST/PUT/DELETE on watchlists, alerts |
| Pipelines | 5/min | `/pipelines/run` |
| Health | No limit | `/health` |

### Live Data (as of 2026-02-08)
- **891 raw signals** ingested from real APIs
- **318 processed signals** (promoted through NLP pipeline)
- **233 companies** with risk scores and trends
- **583 signals discarded** (below 100-device threshold)
- Real companies: Amazon, Meta, Macy's, Wells Fargo, Thermo Fisher, Phillips 66, Constellation Brands, Nestle, etc.

### Deployment

#### Production URLs
- **Frontend**: https://disposight.com (Vercel)
- **Backend**: https://backend-production-97dd.up.railway.app (Railway)
- **Health check**: https://backend-production-97dd.up.railway.app/health

#### Infrastructure
- **Frontend hosting**: Vercel (project: `prj_TYoEuecn9uB5TCOoWFk8FGwOsN2Q`, team: `team_ZQlmyA4h4rtWutfE0I8kuJok`)
- **Backend hosting**: Railway (project: `disposight-backend`)
- **Redis**: Railway (internal URL, same project as backend)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (ES256 JWKS + HS256 fallback)

#### Environment Variables (all set in production)
- Railway backend: DATABASE_URL, REDIS_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, RESEND_API_KEY, COURTLISTENER_API_KEY, FRONTEND_URL, ALLOWED_ORIGINS
- Vercel frontend: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

### Completed
- **Custom domain DNS** — `disposight.com` A record → `76.76.21.21` (Vercel), `www` CNAME → `cname.vercel-dns.com`
- **Embedded Stripe checkout** — Switched from redirect to in-page embedded checkout on Settings page
- **Stripe packages** — `@stripe/react-stripe-js` + `@stripe/stripe-js` added to frontend

### What's Left
- **Auth flow test** — Manual test needed (register → login → dashboard)
- **Stripe webhook endpoint** — Register `https://backend-production-97dd.up.railway.app/api/v1/billing/webhook` in Stripe dashboard
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** — Set in Vercel env vars (needed for embedded checkout)

### GitHub
- Repo: `disposight/Disposight`
- Branch: `main`
- Latest commit: `d5febdc` (Switch Stripe checkout from redirect to embedded mode)
- Authenticated as: `ecosio1`

### Supabase
- Project ref: `yspgrbmthpmugqygobwu`
- Dashboard: `https://supabase.com/dashboard/project/yspgrbmthpmugqygobwu`
- All 10 tables created, RLS enabled, 3 migrations applied

### MCP Servers
- **Supabase**: Connected and authenticated
- **GitHub**: Connected and authenticated
- **Vercel**: Connected and authenticated
- **Railway**: Connected and authenticated

### Dev Server
- Frontend: `http://localhost:3000` (`cd frontend && npm run dev`)
- Backend: `http://localhost:8000` (`cd backend && uv run uvicorn app.main:app --reload`)

### Key Files
- `frontend/src/contexts/plan-context.tsx` — PlanProvider (fetches user plan once)
- `frontend/src/components/dashboard/plan-gate.tsx` — Upgrade wall for free users
- `frontend/src/app/dashboard/layout.tsx` — Wraps children in PlanProvider
- `backend/app/rate_limit.py` — SlowAPI limiter instance + key function
- `backend/app/processing/llm_client.py` — OpenAI-powered, model map: "haiku" → gpt-4o-mini, "sonnet" → gpt-4o
- Gated pages: Overview, Signals, Companies, Company detail, Map, Watchlist, Alerts
- Ungated pages: Settings, Help
