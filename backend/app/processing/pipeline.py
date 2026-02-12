"""Main NLP processing pipeline.

Processes raw signals through: entity extraction → classification → scoring → correlation.
"""

from datetime import timedelta

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RawSignal, Signal
from app.processing.device_filter import estimate_devices
from app.processing.entity_extractor import extract_entities, find_or_create_company, _clean_llm_value, validate_state_code
from app.processing.risk_scorer import update_company_risk_score
from app.processing.signal_classifier import classify_signal
from app.email.sender import match_and_send_realtime_alerts
from app.processing.signal_correlator import correlate_signal

logger = structlog.get_logger()

BATCH_SIZE = 20

# Normalize LLM-returned signal types to canonical values
SIGNAL_TYPE_ALIASES: dict[str, str] = {
    "facility_closure": "facility_shutdown",
    "facility_closing": "facility_shutdown",
    "shutdown": "facility_shutdown",
    "plant_closure": "plant_closing",
    "news": "restructuring",
    "unknown": "restructuring",
    "office_closing": "office_closure",
    "bankruptcy": "bankruptcy_ch11",
    "chapter_7": "bankruptcy_ch7",
    "chapter_11": "bankruptcy_ch11",
    "ch7": "bankruptcy_ch7",
    "ch11": "bankruptcy_ch11",
    "asset_sale": "liquidation",
    "closure": "facility_shutdown",
    "layoffs": "layoff",
    "downsizing": "layoff",
    "workforce_reduction": "layoff",
}


def _normalize_signal_type(raw_type: str) -> str:
    """Map variant signal types to canonical values."""
    return SIGNAL_TYPE_ALIASES.get(raw_type, raw_type)


async def process_pending_signals(db: AsyncSession) -> dict:
    """Process a batch of raw signals through the NLP pipeline."""
    result = await db.execute(
        select(RawSignal)
        .where(RawSignal.processing_status == "raw")
        .order_by(RawSignal.created_at)
        .limit(BATCH_SIZE)
    )
    raw_signals = result.scalars().all()

    if not raw_signals:
        return {"processed": 0}

    processed = 0
    errors = 0
    dedup_count = 0
    companies_to_update = set()

    for raw in raw_signals:
        try:
            # Step 1: Entity extraction
            entities = await extract_entities(raw.raw_text or raw.company_name, raw.source_type)
            company_name = entities.get("company_name", raw.company_name)
            summary = entities.get("summary", raw.raw_text)

            # Step 2: Find or create company
            try:
                company = await find_or_create_company(
                    db,
                    company_name,
                    city=entities.get("location_city"),
                    state=entities.get("location_state"),
                )
            except ValueError:
                raw.processing_status = "discarded"
                logger.info("pipeline.skipped_bad_company", raw_signal_id=str(raw.id), name=company_name)
                continue

            # Step 3: Classification
            classification = await classify_signal(
                raw.raw_text or raw.company_name,
                company_name,
                raw.source_type,
            )

            # Step 4: Normalize signal type
            raw_signal_type = classification.get("signal_type", raw.event_type)
            signal_type = _normalize_signal_type(raw_signal_type)

            # Step 5: Device estimation
            employees = entities.get("employees_affected") or raw.employees_affected
            if not employees and company.employee_count:
                employees = company.employee_count

            # Cap employees — LLM often extracts total company headcount
            if employees and employees > 50_000:
                logger.warning(
                    "pipeline.employee_count_capped",
                    raw_signal_id=str(raw.id),
                    original=employees,
                    capped_at=50_000,
                )
                employees = 50_000
            # Extra cap for SEC EDGAR restructuring signals
            if raw.source_type == "sec_edgar" and signal_type == "restructuring" and employees and employees > 5000:
                employees = min(employees, 5000)

            device_estimate = estimate_devices(signal_type, employees)

            # Step 5b: Dedup check — skip if same company+type within 2-day window
            window_start = raw.created_at - timedelta(days=2)
            window_end = raw.created_at + timedelta(days=2)
            existing = await db.execute(
                select(Signal.id).where(
                    and_(
                        Signal.company_id == company.id,
                        Signal.signal_type == signal_type,
                        Signal.source_published_at >= window_start,
                        Signal.source_published_at <= window_end,
                    )
                ).limit(1)
            )
            if existing.scalar_one_or_none() is not None:
                raw.processing_status = "discarded"
                raw.discard_reason = "duplicate_signal"
                dedup_count += 1
                logger.info(
                    "pipeline.duplicate_skipped",
                    raw_signal_id=str(raw.id),
                    company_id=str(company.id),
                    signal_type=signal_type,
                )
                continue

            # Step 6: Create processed signal
            signal = Signal(
                raw_signal_id=raw.id,
                company_id=company.id,
                signal_type=signal_type,
                signal_category=classification.get("signal_category", "news"),
                title=f"{company_name}: {raw.event_type}",
                summary=summary,
                confidence_score=classification.get("confidence_score", 50),
                severity_score=classification.get("severity_score", 50),
                source_name=raw.source_type,
                source_url=raw.source_url,
                source_published_at=raw.created_at,
                location_city=_clean_llm_value(entities.get("location_city")),
                location_state=validate_state_code(_clean_llm_value(entities.get("location_state"))),
                affected_employees=employees,
                device_estimate=device_estimate,
            )
            db.add(signal)
            await db.flush()

            # Step 7: Correlation
            await correlate_signal(db, signal)

            # Step 8: Real-time email alerts
            try:
                await match_and_send_realtime_alerts(db, signal)
            except Exception as alert_err:
                logger.error(
                    "pipeline.alert_error",
                    signal_id=str(signal.id),
                    error=str(alert_err),
                )

            # Mark raw signal as processed
            raw.processing_status = "processed"
            companies_to_update.add(company.id)
            processed += 1

            logger.info(
                "pipeline.signal_processed",
                signal_id=str(signal.id),
                company=company_name,
                type=signal.signal_type,
                confidence=signal.confidence_score,
                severity=signal.severity_score,
                device_estimate=device_estimate,
            )

        except Exception as e:
            raw.processing_status = "raw"  # Keep for retry
            errors += 1
            logger.error(
                "pipeline.signal_error",
                raw_signal_id=str(raw.id),
                error=str(e),
            )

    # Step 9: Update company risk scores
    for company_id in companies_to_update:
        await update_company_risk_score(db, company_id)

    await db.flush()

    logger.info(
        "pipeline.batch_complete",
        processed=processed,
        errors=errors,
        duplicates_skipped=dedup_count,
        companies_updated=len(companies_to_update),
    )

    return {"processed": processed, "errors": errors, "duplicates_skipped": dedup_count}
