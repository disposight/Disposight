"""Pipeline management endpoints: trigger collection, check for new signals."""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.v1.deps import AdminUserId, CurrentUserId, DbSession
from app.models import RawSignal, Signal
from app.rate_limit import limiter

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


class NewSignalsResponse(BaseModel):
    new_count: int
    latest_at: str | None


class EnrichResponse(BaseModel):
    message: str
    stats: dict


class PipelineRunResponse(BaseModel):
    warn_act: dict | None = None
    gdelt: dict | None = None
    sec_edgar: dict | None = None
    courtlistener: dict | None = None
    processing: dict | None = None


@router.get("/new-signals", response_model=NewSignalsResponse)
@limiter.limit("60/minute")
async def check_new_signals(
    request: Request,
    user_id: CurrentUserId,
    db: DbSession,
    since: str = Query(
        ...,
        description="ISO 8601 timestamp — return signals created after this time",
    ),
):
    """Poll for new signals since a given timestamp. Used by frontend for badge count."""
    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except ValueError:
        since_dt = datetime.now(timezone.utc)

    result = await db.execute(
        select(func.count(Signal.id), func.max(Signal.created_at)).where(
            Signal.created_at > since_dt
        )
    )
    row = result.one()
    count = row[0] or 0
    latest = row[1]

    return NewSignalsResponse(
        new_count=count,
        latest_at=latest.isoformat() if latest else None,
    )


@router.post("/run", response_model=PipelineRunResponse)
@limiter.limit("5/minute")
async def trigger_pipeline_run(request: Request, user_id: AdminUserId, db: DbSession):
    """Manually trigger all 4 collectors + processing pipeline.
    Runs collectors concurrently, then processes raw signals.
    """
    from app.ingestion.courtlistener import CourtListenerCollector
    from app.ingestion.gdelt_news import GdeltCollector
    from app.ingestion.sec_edgar import SecEdgarCollector
    from app.ingestion.warn_act import WarnActCollector
    from app.processing.pipeline import process_pending_signals

    results = PipelineRunResponse()

    # Run all 4 collectors (each needs its own session for isolation)
    from app.db.session import async_session_factory

    async def run_collector(collector_cls, name):
        try:
            async with async_session_factory() as session:
                collector = collector_cls(session)
                result = await collector.run()
                await session.commit()
                return result
        except Exception as e:
            return {"error": str(e)}

    warn, gdelt, edgar, court = await asyncio.gather(
        run_collector(WarnActCollector, "warn_act"),
        run_collector(GdeltCollector, "gdelt"),
        run_collector(SecEdgarCollector, "sec_edgar"),
        run_collector(CourtListenerCollector, "courtlistener"),
    )

    results.warn_act = warn
    results.gdelt = gdelt
    results.sec_edgar = edgar
    results.courtlistener = court

    # Process all new raw signals
    total_processed = 0
    while True:
        async with async_session_factory() as session:
            batch = await process_pending_signals(session)
            await session.commit()
        p = batch.get("processed", 0)
        total_processed += p
        if p == 0:
            break

    results.processing = {"processed": total_processed}
    return results


@router.post("/enrich-companies", response_model=EnrichResponse)
@limiter.limit("5/minute")
async def trigger_company_enrichment(
    request: Request,
    user_id: AdminUserId,
    db: DbSession,
    backfill: bool = Query(False, description="Enrich ALL pending companies (not just one batch)"),
):
    """Enrich pending companies with firmographic data from SEC EDGAR + LLM."""
    from app.processing.company_enricher import backfill_all_companies, enrich_pending_companies

    if backfill:
        from app.db.session import async_session_factory

        async with async_session_factory() as session:
            stats = await backfill_all_companies(session, batch_size=30)
        return EnrichResponse(message="Backfill complete", stats=stats)

    stats = await enrich_pending_companies(db, batch_size=20)
    return EnrichResponse(message="Batch enrichment complete", stats=stats)
