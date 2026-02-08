import hashlib
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RawSignal, SignalSource

logger = structlog.get_logger()


class BaseCollector(ABC):
    """Abstract base class for all data source collectors."""

    source_name: str
    source_type: str

    def __init__(self, db: AsyncSession):
        self.db = db

    @abstractmethod
    async def collect(self) -> list[dict]:
        """Fetch and return normalized raw signal dicts from the data source."""
        ...

    async def run(self) -> dict:
        """Execute the full collection cycle: fetch, dedup, filter, store."""
        start_time = time.monotonic()
        source = await self._get_or_create_source()

        try:
            logger.info("collector.started", source=self.source_name)
            raw_items = await self.collect()

            new_count = 0
            dup_count = 0
            filtered_count = 0

            for item in raw_items:
                content_hash = self._compute_hash(item)

                # Dedup check
                existing = await self.db.execute(
                    select(RawSignal.id).where(RawSignal.content_hash == content_hash).limit(1)
                )
                if existing.scalar_one_or_none():
                    dup_count += 1
                    continue

                # Critical filter: 100+ devices potential?
                employees = item.get("employees_affected")
                if employees is not None and employees < 67:
                    # ~67 employees * 1.5 = ~100 devices
                    filtered_count += 1
                    signal = RawSignal(
                        source_type=self.source_type,
                        company_name=item["company_name"],
                        event_type=item["event_type"],
                        event_date=item.get("event_date"),
                        locations=item.get("locations", []),
                        employees_affected=employees,
                        source_url=item.get("source_url"),
                        raw_text=item.get("raw_text"),
                        content_hash=content_hash,
                        processing_status="discarded",
                        discard_reason="below_device_threshold",
                    )
                    self.db.add(signal)
                    continue

                signal = RawSignal(
                    source_type=self.source_type,
                    company_name=item["company_name"],
                    event_type=item["event_type"],
                    event_date=item.get("event_date"),
                    locations=item.get("locations", []),
                    employees_affected=employees,
                    source_url=item.get("source_url"),
                    raw_text=item.get("raw_text"),
                    content_hash=content_hash,
                    processing_status="raw",
                )
                self.db.add(signal)
                new_count += 1

            await self.db.flush()

            duration_ms = int((time.monotonic() - start_time) * 1000)
            source.last_run_at = datetime.now(timezone.utc)
            source.last_run_status = "success"
            source.last_run_signals_count = new_count
            source.last_run_duration_ms = duration_ms
            source.error_count = 0

            logger.info(
                "collector.completed",
                source=self.source_name,
                signals_found=len(raw_items),
                signals_new=new_count,
                signals_duplicate=dup_count,
                signals_filtered=filtered_count,
                duration_ms=duration_ms,
            )

            return {
                "source": self.source_name,
                "found": len(raw_items),
                "new": new_count,
                "duplicate": dup_count,
                "filtered": filtered_count,
            }

        except Exception as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            source.last_run_at = datetime.now(timezone.utc)
            source.last_run_status = "failed"
            source.last_run_duration_ms = duration_ms
            source.error_count = (source.error_count or 0) + 1
            source.last_error = str(e)[:500]

            logger.error(
                "collector.failed",
                source=self.source_name,
                error=str(e),
            )
            raise

    async def _get_or_create_source(self) -> SignalSource:
        result = await self.db.execute(
            select(SignalSource).where(SignalSource.name == self.source_name)
        )
        source = result.scalar_one_or_none()
        if not source:
            source = SignalSource(name=self.source_name, source_type=self.source_type)
            self.db.add(source)
            await self.db.flush()
        return source

    def _compute_hash(self, item: dict) -> str:
        key = f"{item['company_name']}|{item['event_type']}|{item.get('event_date', '')}|{item.get('source_url', '')}"
        return hashlib.sha256(key.encode()).hexdigest()
