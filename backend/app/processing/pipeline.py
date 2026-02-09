"""Main NLP processing pipeline.

Processes raw signals through: entity extraction → classification → scoring → correlation.
"""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RawSignal, Signal
from app.processing.device_filter import estimate_devices
from app.processing.entity_extractor import extract_entities, find_or_create_company
from app.processing.risk_scorer import update_company_risk_score
from app.processing.signal_classifier import classify_signal
from app.processing.signal_correlator import correlate_signal

logger = structlog.get_logger()

BATCH_SIZE = 20


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
    companies_to_update = set()

    for raw in raw_signals:
        try:
            # Step 1: Entity extraction
            entities = await extract_entities(raw.raw_text or raw.company_name, raw.source_type)
            company_name = entities.get("company_name", raw.company_name)
            summary = entities.get("summary", raw.raw_text)

            # Step 2: Find or create company
            company = await find_or_create_company(
                db,
                company_name,
                city=entities.get("location_city"),
                state=entities.get("location_state"),
            )

            # Step 3: Classification
            classification = await classify_signal(
                raw.raw_text or raw.company_name,
                company_name,
                raw.source_type,
            )

            # Step 4: Device estimation
            employees = entities.get("employees_affected") or raw.employees_affected
            if not employees and company.employee_count:
                employees = company.employee_count
            device_estimate = estimate_devices(
                classification.get("signal_type", raw.event_type),
                employees,
            )

            # Step 5: Create processed signal
            signal = Signal(
                raw_signal_id=raw.id,
                company_id=company.id,
                signal_type=classification.get("signal_type", raw.event_type),
                signal_category=classification.get("signal_category", "news"),
                title=f"{company_name}: {raw.event_type}",
                summary=summary,
                confidence_score=classification.get("confidence_score", 50),
                severity_score=classification.get("severity_score", 50),
                source_name=raw.source_type,
                source_url=raw.source_url,
                source_published_at=raw.created_at,
                location_city=entities.get("location_city"),
                location_state=entities.get("location_state"),
                affected_employees=employees,
                device_estimate=device_estimate,
            )
            db.add(signal)
            await db.flush()

            # Step 6: Correlation
            await correlate_signal(db, signal)

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

    # Step 7: Update company risk scores
    for company_id in companies_to_update:
        await update_company_risk_score(db, company_id)

    await db.flush()

    logger.info(
        "pipeline.batch_complete",
        processed=processed,
        errors=errors,
        companies_updated=len(companies_to_update),
    )

    return {"processed": processed, "errors": errors}
