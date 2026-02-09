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

### Deal Rank Score v2 (completed 2026-02-09, NOT YET COMMITTED)
- `compute_deal_score()` now returns `DealScoreResult` dataclass (score, band, band_label, 8 ScoreFactors with points/max/summary, top_factors, penalty/boost flags)
- Score bands: 85+ Immediate Pursuit (red), 70-84 High Priority (orange), 55-69 Qualified Pipeline (yellow), 0-54 Background (gray)
- `DealScoreBadge` accepts optional `bandLabel` prop from API
- New `score-breakdown.tsx`: `CompactScoreBreakdown` (top 3 bullets for cards) + `FullScoreBreakdown` (8 progress bars for detail page)
- `OpportunityOut` has `score_band`, `score_band_label`, `top_factors`
- `OpportunityDetailOut` has `score_breakdown`, `signal_velocity` (signals/month)
- Distress pattern logging via structlog in `get_opportunity()` for future analysis
- Scoring overhead: 6.2 microseconds/call (162k scores/sec) — negligible vs DB queries
- All 7 backend tests pass, frontend builds clean, `tsc --noEmit` zero errors

### What's Left — UNCOMMITTED CODE
- **29 modified + 21 new files** in working directory — NOTHING since `d5febdc` has been deployed
- Run `git status` to see full list — includes opportunities engine, deal scorer, watchlists, pipeline, settings, score breakdown UI, and more

### Production Readiness Audit (2026-02-09)

#### BLOCKERS (fix before anyone pays)

1. **Stripe account mismatch** — Local `pk_test_51Qj0l2Rwv...` is from a DIFFERENT Stripe account than Railway's `sk_test_51Syegu...`. Frontend and backend talk to different Stripe accounts. Get matching `pk_live_`/`sk_live_` pair from the SAME account.

2. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` not set on Vercel** — Embedded checkout calls `loadStripe(undefined)`. Users click Subscribe and nothing happens.

3. **Stripe webhook not registered** — `STRIPE_WEBHOOK_SECRET` is set on Railway but endpoint not registered in Stripe dashboard. Users pay but plan never updates. Register: `https://backend-production-97dd.up.railway.app/api/v1/billing/webhook`

4. **`price_id` parameter mismatch in billing.py** — Frontend sends `price_id` in JSON body, but `billing.py` reads it as a query parameter (`price_id: str = ""`). Pro plan checkout silently defaults to Starter. Fix: change to a Pydantic body model.

5. **Registration failure is silent** — If `api.authCallback()` fails during signup, user gets Supabase auth with no tenant record. Every API call returns 403 forever. Need retry on dashboard load.

6. **Commit and deploy** — 50 files uncommitted. Production is running stale code.

#### HIGH PRIORITY (fix before scaling)

7. **No error monitoring** — No Sentry/Datadog/anything. Production errors vanish silently.
8. **No global exception handler** — Unhandled exceptions return raw 500s, no structured error logging.
9. **Missing `customer.subscription.updated` webhook handler** — Plan changes via Stripe billing portal not reflected. Only `checkout.session.completed` and `subscription.deleted` handled.
10. **Test coverage: 3.1%** — 7 tests across 29 modules. Deal scorer, billing, all 4 ingestion pipelines, all API endpoints have zero tests.
11. **No security headers** — Missing HSTS, X-Frame-Options, CSP, X-Content-Type-Options.
12. **Rate limiter JWT decode without signature verification** — `rate_limit.py` decodes JWTs with `verify_signature=False` for keying. Attacker can craft fake JWT to exhaust another user's rate limit.
13. **Pipeline endpoints have no admin check** — Any authenticated user (including free) can trigger `/pipelines/run`, burning OpenAI credits.

#### MEDIUM PRIORITY (fix soon after launch)

14. **RLS InitPlan performance** — 6 tenant-isolation policies re-evaluate `auth.jwt()` per row. Fix: use `(SELECT auth.jwt() ->> 'tenant_id')` instead.
15. **7 unindexed foreign keys** — `alert_history.alert_id_fkey`, `alert_history.signal_id_fkey`, `alert_history.user_id_fkey`, `signals.raw_signal_id_fkey`, `users.tenant_id_fkey`, `watchlists.added_by_fkey`, `watchlists.company_id_fkey`.
16. **Supabase leaked password protection disabled** — Enable in Dashboard > Auth > Security.
17. **Signals endpoint latency** — 700-900ms avg at 318 signals. Will degrade with volume.
18. **DB connection limit ~12 concurrent** — Supabase bottleneck. Pool is 10+20 overflow but server caps at ~12. Needs PgBouncer/Supavisor before scale.
19. **Health endpoint shallow** — Returns `{"status":"ok"}` without checking DB or Redis.
20. **Stripe keys are test mode** — `sk_test_`/`pk_test_` must switch to live keys for real payments.

#### Suggested Attack Order

| Step | What | Time |
|------|------|------|
| 1 | Fix Stripe key mismatch — get matching `pk_live_`/`sk_live_` pair | 15 min |
| 2 | Fix `price_id` body vs query param bug in `billing.py` | 5 min |
| 3 | Add tenant creation retry on dashboard load | 30 min |
| 4 | Commit everything, deploy to Railway + Vercel | 10 min |
| 5 | Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on Vercel | 2 min |
| 6 | Register webhook URL in Stripe dashboard | 5 min |
| 7 | Add Sentry to backend + frontend | 30 min |
| 8 | Add global exception handler + security headers | 20 min |
| 9 | Add `customer.subscription.updated` handler | 15 min |
| 10 | Write tests for deal_scorer + billing + auth | 2-3 hrs |

### Load Test Results (2026-02-09)

| Metric | Value |
|--------|-------|
| `/health` throughput | 1,291 req/s (50 concurrent) |
| `/health` P95 | 33ms |
| `/api/v1/signals` avg | 874ms (single), 814ms (5 concurrent) |
| `/api/v1/companies` avg | 356ms (single), OK at 10 concurrent |
| DB concurrency breaking point | ~12-15 (500 errors at 15+) |
| Rate limiting | Engages correctly at ~20 req on 60/min endpoints |
| Sustained throughput (200 req) | 665 req/s, P99=33ms on `/health` |
| `compute_deal_score()` | 6.2μs/call, 162k/sec |
| `ScoreBreakdownOut` payload | 1,155 bytes per detail response |

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
- `backend/app/processing/deal_scorer.py` — DealScoreResult with 8-factor breakdown, bands, summaries
- `frontend/src/components/dashboard/score-breakdown.tsx` — Compact + Full score breakdown display
- Gated pages: Overview, Signals, Companies, Company detail, Map, Watchlist, Alerts
- Ungated pages: Settings, Help
