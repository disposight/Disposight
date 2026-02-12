"""Tests for pipeline deduplication logic.

Uses an in-memory SQLite database with minimal table definitions to verify
that the dedup query correctly identifies duplicate signals (same company +
type within a 2-day window).
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import Column, DateTime, Integer, String, Table, MetaData, select, and_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Minimal table definitions that work with SQLite (no JSONB/UUID columns)
metadata = MetaData()

companies_table = Table(
    "companies", metadata,
    Column("id", String(36), primary_key=True),
    Column("name", String(500), nullable=False),
    Column("normalized_name", String(500), nullable=False),
)

signals_table = Table(
    "signals", metadata,
    Column("id", String(36), primary_key=True),
    Column("company_id", String(36), nullable=False),
    Column("signal_type", String(50), nullable=False),
    Column("signal_category", String(50), nullable=False),
    Column("title", String(500), nullable=False),
    Column("source_name", String(255), nullable=False),
    Column("source_published_at", DateTime(timezone=True)),
    Column("severity_score", Integer, default=0),
)


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def company_id(db: AsyncSession):
    cid = str(uuid.uuid4())
    await db.execute(companies_table.insert().values(id=cid, name="Acme Corp", normalized_name="acme"))
    await db.flush()
    return cid


async def _has_duplicate(db: AsyncSession, company_id: str, signal_type: str, reference_dt: datetime) -> bool:
    """Mirrors the dedup query from pipeline.py."""
    window_start = reference_dt - timedelta(days=2)
    window_end = reference_dt + timedelta(days=2)
    result = await db.execute(
        select(signals_table.c.id).where(
            and_(
                signals_table.c.company_id == company_id,
                signals_table.c.signal_type == signal_type,
                signals_table.c.source_published_at >= window_start,
                signals_table.c.source_published_at <= window_end,
            )
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _insert_signal(db, company_id: str, signal_type: str, published_at: datetime):
    await db.execute(signals_table.insert().values(
        id=str(uuid.uuid4()),
        company_id=company_id,
        signal_type=signal_type,
        signal_category="news",
        title="Test signal",
        source_name="test",
        source_published_at=published_at,
        severity_score=50,
    ))
    await db.flush()


@pytest.mark.asyncio
async def test_no_duplicate_creates_signal(db, company_id):
    """Signal should be created when no duplicate exists."""
    now = datetime.now(timezone.utc)
    assert not await _has_duplicate(db, company_id, "layoff", now)


@pytest.mark.asyncio
async def test_duplicate_within_window_is_skipped(db, company_id):
    """Signal should be skipped when same company+type exists within 2-day window."""
    now = datetime.now(timezone.utc)
    await _insert_signal(db, company_id, "layoff", now)

    assert await _has_duplicate(db, company_id, "layoff", now)
    assert await _has_duplicate(db, company_id, "layoff", now + timedelta(days=1))
    assert await _has_duplicate(db, company_id, "layoff", now - timedelta(days=1))


@pytest.mark.asyncio
async def test_outside_window_creates_signal(db, company_id):
    """Signal should be created when same company+type is outside 2-day window."""
    now = datetime.now(timezone.utc)
    await _insert_signal(db, company_id, "layoff", now - timedelta(days=5))

    assert not await _has_duplicate(db, company_id, "layoff", now)


@pytest.mark.asyncio
async def test_different_type_in_window_creates_signal(db, company_id):
    """Signal should be created when same company but different type in window."""
    now = datetime.now(timezone.utc)
    await _insert_signal(db, company_id, "layoff", now)

    assert not await _has_duplicate(db, company_id, "bankruptcy_ch7", now)
