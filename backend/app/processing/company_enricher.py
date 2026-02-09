"""Company enrichment pipeline.

Two-stage enrichment:
  Stage 1 — SEC EDGAR: Match against public company tickers, fetch SIC/industry/state.
  Stage 2 — LLM Fallback: For private companies, estimate employee_count and industry via gpt-4o-mini.
"""

import asyncio
import re
from datetime import datetime, timezone

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Company, Signal
from app.processing.llm_client import llm_client

logger = structlog.get_logger()

# SIC code → (industry, sector) mapping based on standard SIC divisions
SIC_INDUSTRY_MAP = [
    (100, 999, "Agriculture", "Agriculture, Forestry & Fishing"),
    (1000, 1499, "Mining", "Mining"),
    (1500, 1799, "Construction", "Construction"),
    (2000, 3999, "Manufacturing", "Manufacturing"),
    (4000, 4999, "Transportation & Utilities", "Transportation & Utilities"),
    (5000, 5199, "Wholesale Trade", "Wholesale Trade"),
    (5200, 5999, "Retail Trade", "Retail Trade"),
    (6000, 6799, "Financial Services", "Finance, Insurance & Real Estate"),
    (7000, 8999, "Professional Services", "Services"),
    (9100, 9999, "Public Administration", "Public Administration"),
]

# Suffixes to strip during normalization
_SUFFIXES = [
    ", inc.", ", inc", " inc.", " inc",
    ", llc", " llc",
    ", ltd.", ", ltd", " ltd.", " ltd",
    ", corp.", " corp.", ", corp", " corp",
    " co.", " co",
    " company", " companies",
    " group", " holdings", " international",
    ", l.p.", " l.p.", " lp",
    " plc", ", plc",
    " sa", " ag", " nv", " se",
    " the",
]


class CompanyEnricher:
    """Enriches company records with firmographic data from SEC EDGAR and LLM."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._sec_tickers: dict | None = None
        self._last_sec_request = 0.0

    async def _rate_limit_sec(self):
        """Enforce SEC's 10 requests/second rate limit."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_sec_request
        if elapsed < 0.1:
            await asyncio.sleep(0.1 - elapsed)
        self._last_sec_request = asyncio.get_event_loop().time()

    async def _fetch_sec_tickers(self) -> dict:
        """Fetch and cache the SEC company tickers file (~13k public companies)."""
        if self._sec_tickers is not None:
            return self._sec_tickers

        url = "https://www.sec.gov/files/company_tickers.json"
        headers = {"User-Agent": settings.sec_user_agent}

        for attempt in range(3):
            try:
                await self._rate_limit_sec()
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(url, headers=headers)
                    resp.raise_for_status()
                    self._sec_tickers = resp.json()
                    logger.info("enricher.sec_tickers_loaded", count=len(self._sec_tickers))
                    return self._sec_tickers
            except Exception as e:
                logger.warning("enricher.sec_tickers_fetch_failed", attempt=attempt + 1, error=str(e))
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        self._sec_tickers = {}
        return self._sec_tickers

    @staticmethod
    def _normalize_for_matching(name: str) -> str:
        """Aggressive normalization for company name matching."""
        name = name.strip().lower()
        for suffix in _SUFFIXES:
            if name.endswith(suffix):
                name = name[: -len(suffix)]
        name = re.sub(r"[^\w\s]", "", name)
        name = re.sub(r"\s+", " ", name).strip()
        return name

    def _find_sec_match(self, company_name: str, tickers_data: dict) -> dict | None:
        """Find a matching SEC company by normalized name."""
        target = self._normalize_for_matching(company_name)
        if not target or len(target) < 3:
            return None

        # Build lookup: normalized_name → entry (on first call per batch)
        best_match = None

        for entry in tickers_data.values():
            sec_name = entry.get("title", "")
            sec_normalized = self._normalize_for_matching(sec_name)

            # Exact match
            if sec_normalized == target:
                return entry

            # Containment match (only for names >= 5 chars to avoid false positives)
            if len(target) >= 5 and (target in sec_normalized or sec_normalized in target):
                if best_match is None or len(sec_normalized) < len(best_match.get("title", "")):
                    best_match = entry

        return best_match

    async def _fetch_sec_submissions(self, cik: int) -> dict | None:
        """Fetch detailed SEC submission data for a company by CIK."""
        cik_padded = str(cik).zfill(10)
        url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
        headers = {"User-Agent": settings.sec_user_agent}

        try:
            await self._rate_limit_sec()
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("enricher.sec_submissions_failed", cik=cik, error=str(e))
            return None

    @staticmethod
    def _map_sic_to_industry(sic_code: str) -> tuple[str | None, str | None]:
        """Map an SIC code to human-readable industry and sector names."""
        try:
            sic = int(sic_code)
        except (ValueError, TypeError):
            return None, None

        for low, high, industry, sector in SIC_INDUSTRY_MAP:
            if low <= sic <= high:
                return industry, sector
        return None, None

    async def _enrich_from_sec(self, company: Company) -> bool:
        """Stage 1: Enrich company from SEC EDGAR data. Returns True if enriched."""
        tickers = await self._fetch_sec_tickers()
        if not tickers:
            return False

        match = self._find_sec_match(company.name, tickers)
        if not match:
            return False

        cik = match.get("cik_str")
        ticker = match.get("ticker")

        # Set ticker immediately even before fetching submissions
        if ticker and not company.ticker:
            company.ticker = ticker
        if cik and not company.cik:
            company.cik = str(cik)

        # Fetch detailed submissions for SIC code, state, etc.
        submissions = await self._fetch_sec_submissions(cik)
        if submissions:
            sic_code = submissions.get("sic")
            if sic_code and not company.sic_code:
                company.sic_code = str(sic_code)
                industry, sector = self._map_sic_to_industry(str(sic_code))
                if industry and not company.industry:
                    company.industry = industry
                if sector and not company.sector:
                    company.sector = sector

            state = submissions.get("stateOfIncorporation") or submissions.get("addresses", {}).get("business", {}).get("stateOrCountry")
            if state and not company.headquarters_state:
                company.headquarters_state = state

        logger.info(
            "enricher.sec_match",
            company=company.name,
            ticker=company.ticker,
            sic=company.sic_code,
            industry=company.industry,
        )
        return True

    async def _enrich_from_llm(self, company: Company) -> bool:
        """Stage 2: Enrich company using LLM estimation. Returns True if enriched."""
        # Gather signal context for this company
        result = await self.db.execute(
            select(Signal)
            .where(Signal.company_id == company.id)
            .order_by(Signal.created_at.desc())
            .limit(5)
        )
        signals = result.scalars().all()

        signal_context = ""
        if signals:
            lines = []
            for s in signals:
                lines.append(f"- {s.signal_type}: {s.title} ({s.source_name})")
            signal_context = "\n".join(lines)

        location_info = ""
        if company.headquarters_city or company.headquarters_state:
            parts = [p for p in [company.headquarters_city, company.headquarters_state] if p]
            location_info = "Location: " + ", ".join(parts)

        prompt_parts = [
            "Estimate firmographic data for this company. Return JSON only.",
            "",
            f"Company name: {company.name}",
        ]
        if location_info:
            prompt_parts.append(location_info)
        if signal_context:
            prompt_parts.append(f"Recent signals:\n{signal_context}")
        prompt_parts.extend([
            "",
            'Return ONLY valid JSON with these fields:',
            '- "employee_count": estimated number of employees (integer, or null if unknown)',
            '- "industry": industry category (string, e.g. "Technology", "Manufacturing", "Retail Trade", "Financial Services", "Healthcare")',
            '- "confidence": your confidence in these estimates (integer 0-100)',
            "",
            "JSON:",
        ])
        prompt = "\n".join(prompt_parts)

        try:
            result = await llm_client.complete_json(prompt, model="haiku", max_tokens=256)
            confidence = result.get("confidence", 0)
            if confidence < 40:
                logger.info("enricher.llm_low_confidence", company=company.name, confidence=confidence)
                return False

            employee_count = result.get("employee_count")
            industry = result.get("industry")

            if employee_count and not company.employee_count:
                company.employee_count = int(employee_count)
            if industry and not company.industry:
                company.industry = str(industry)

            logger.info(
                "enricher.llm_enriched",
                company=company.name,
                employee_count=company.employee_count,
                industry=company.industry,
                confidence=confidence,
            )
            return True

        except Exception as e:
            logger.warning("enricher.llm_failed", company=company.name, error=str(e))
            return False

    async def enrich_company(self, company: Company) -> str:
        """Run both enrichment stages. Returns status: enriched/partial/not_found."""
        sec_ok = await self._enrich_from_sec(company)

        # If SEC gave us industry + ticker, that's full enrichment
        if sec_ok and company.ticker and company.industry:
            company.enrichment_status = "enriched"
            company.enriched_at = datetime.now(timezone.utc)
            return "enriched"

        # Try LLM for missing fields (employee_count, industry)
        llm_ok = await self._enrich_from_llm(company)

        if sec_ok or llm_ok:
            status = "enriched" if company.industry and (company.employee_count or company.ticker) else "partial"
            company.enrichment_status = status
            company.enriched_at = datetime.now(timezone.utc)
            return status

        company.enrichment_status = "not_found"
        company.enriched_at = datetime.now(timezone.utc)
        return "not_found"


async def enrich_pending_companies(db: AsyncSession, batch_size: int = 20) -> dict:
    """Process a batch of pending companies. Returns {enriched, partial, not_found, errors}."""
    result = await db.execute(
        select(Company)
        .where(Company.enrichment_status == "pending")
        .order_by(Company.created_at)
        .limit(batch_size)
    )
    companies = result.scalars().all()

    if not companies:
        return {"enriched": 0, "partial": 0, "not_found": 0, "errors": 0, "total": 0}

    enricher = CompanyEnricher(db)
    stats = {"enriched": 0, "partial": 0, "not_found": 0, "errors": 0, "total": len(companies)}

    for company in companies:
        try:
            status = await enricher.enrich_company(company)
            stats[status] = stats.get(status, 0) + 1
        except Exception as e:
            stats["errors"] += 1
            logger.error("enricher.company_error", company=company.name, error=str(e))

    await db.flush()

    logger.info("enricher.batch_complete", **stats)
    return stats


async def backfill_all_companies(db: AsyncSession, batch_size: int = 30) -> dict:
    """Loop through ALL pending companies in batches. Commits after each batch."""
    totals = {"enriched": 0, "partial": 0, "not_found": 0, "errors": 0, "total": 0}

    while True:
        batch_stats = await enrich_pending_companies(db, batch_size=batch_size)
        await db.commit()

        if batch_stats["total"] == 0:
            break

        for key in totals:
            totals[key] += batch_stats[key]

        logger.info("enricher.backfill_progress", **totals)

    logger.info("enricher.backfill_complete", **totals)
    return totals
