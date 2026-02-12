from arq import cron
from arq.connections import RedisSettings

from app.config import settings


async def collect_warn_act(ctx):
    from app.db.session import async_session_factory
    from app.ingestion.warn_act import WarnActCollector

    async with async_session_factory() as db:
        collector = WarnActCollector(db)
        result = await collector.run()
        await db.commit()
        return result


async def collect_gdelt_news(ctx):
    from app.db.session import async_session_factory
    from app.ingestion.gdelt_news import GdeltCollector

    async with async_session_factory() as db:
        collector = GdeltCollector(db)
        result = await collector.run()
        await db.commit()
        return result


async def collect_sec_edgar(ctx):
    from app.db.session import async_session_factory
    from app.ingestion.sec_edgar import SecEdgarCollector

    async with async_session_factory() as db:
        collector = SecEdgarCollector(db)
        result = await collector.run()
        await db.commit()
        return result


async def collect_courtlistener(ctx):
    from app.db.session import async_session_factory
    from app.ingestion.courtlistener import CourtListenerCollector

    async with async_session_factory() as db:
        collector = CourtListenerCollector(db)
        result = await collector.run()
        await db.commit()
        return result


async def collect_globenewswire(ctx):
    from app.db.session import async_session_factory
    from app.ingestion.globenewswire import GlobeNewswireCollector

    async with async_session_factory() as db:
        collector = GlobeNewswireCollector(db)
        result = await collector.run()
        await db.commit()
        return result


async def process_raw_signals(ctx):
    from app.db.session import async_session_factory
    from app.processing.pipeline import process_pending_signals

    async with async_session_factory() as db:
        result = await process_pending_signals(db)
        await db.commit()
        return result


async def enrich_companies(ctx):
    from app.db.session import async_session_factory
    from app.processing.company_enricher import enrich_pending_companies

    async with async_session_factory() as db:
        result = await enrich_pending_companies(db, batch_size=20)
        await db.commit()
        return result


async def backfill_company_enrichment(ctx):
    from app.db.session import async_session_factory
    from app.processing.company_enricher import backfill_all_companies

    async with async_session_factory() as db:
        result = await backfill_all_companies(db, batch_size=30)
        return result


async def refresh_all_risk_scores(ctx):
    from sqlalchemy import select

    from app.db.session import async_session_factory
    from app.models import Company
    from app.processing.risk_scorer import update_company_risk_score

    async with async_session_factory() as db:
        result = await db.execute(
            select(Company.id).where(Company.signal_count > 0)
        )
        company_ids = result.scalars().all()

        updated = 0
        for company_id in company_ids:
            await update_company_risk_score(db, company_id)
            updated += 1

        await db.commit()
        return {"companies_refreshed": updated}


async def send_daily_digest(ctx):
    from app.db.session import async_session_factory
    from app.email.sender import send_digest

    async with async_session_factory() as db:
        await send_digest(db, frequency="daily")
        await db.commit()


async def send_weekly_digest(ctx):
    from app.db.session import async_session_factory
    from app.email.sender import send_digest

    async with async_session_factory() as db:
        await send_digest(db, frequency="weekly")
        await db.commit()


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    functions = [
        collect_warn_act,
        collect_gdelt_news,
        collect_sec_edgar,
        collect_courtlistener,
        collect_globenewswire,
        process_raw_signals,
        enrich_companies,
        backfill_company_enrichment,
        refresh_all_risk_scores,
        send_daily_digest,
        send_weekly_digest,
    ]
    cron_jobs = [
        cron(collect_warn_act, hour={0, 6, 12, 18}),
        cron(collect_gdelt_news, hour=None, minute={0, 30}),
        cron(collect_sec_edgar, hour={1, 7, 13, 19}),
        cron(collect_courtlistener, hour={3, 15}),
        cron(collect_globenewswire, hour={2, 8, 14, 20}),  # 4x/day, offset from EDGAR
        cron(process_raw_signals, hour=None, minute={10, 40}),
        cron(enrich_companies, hour={2, 8, 14, 20}, minute=30),
        cron(refresh_all_risk_scores, hour=5, minute=0),  # Daily 5am UTC
        cron(send_daily_digest, hour=13, minute=0),
        cron(send_weekly_digest, weekday=1, hour=13, minute=0),
    ]
