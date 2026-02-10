import asyncio
import re
from datetime import datetime

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

EDGAR_BASE = "https://efts.sec.gov/LATEST/search-index"
EDGAR_FULL_TEXT = "https://efts.sec.gov/LATEST/search-index"
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions"

# Event keywords that indicate potential asset disposition
# Covers 8-K Items: 1.01 (agreements), 1.03 (bankruptcy), 2.01 (acquisitions/dispositions),
# 2.05 (exit/disposal activities), 2.06 (material impairments), 5.02 (officer departures)
EVENT_KEYWORDS = [
    "restructuring",
    "asset sale",
    "material impairment",
    "workforce reduction",
    "facility closure",
    "plant closing",
    "merger",
    "acquisition",
    "ceasing operations",
    # Item 2.05 — exit or disposal activities
    "exit activities",
    "disposal activities",
    "restructuring charges",
    "severance",
    "lease termination",
    "site closure",
    "office consolidation",
    # Item 2.06 — material impairments
    "impairment charge",
    "goodwill impairment",
    "asset impairment",
    "write-down",
    "long-lived asset",
]


class SecEdgarCollector(BaseCollector):
    source_name = "SEC EDGAR"
    source_type = "sec_edgar"

    def _classify_filing(self, source: dict) -> str:
        """Classify 8-K filing event type from content keywords.

        Covers standard 8-K items plus:
          Item 2.05 — exit/disposal activities (facility closures, severance, lease terminations)
          Item 2.06 — material impairments (asset write-downs preceding liquidation)
        """
        display_names = source.get("display_names", [])
        first_name = ""
        if isinstance(display_names, list) and display_names:
            first_name = display_names[0] if isinstance(display_names[0], str) else str(display_names[0])

        text = " ".join([
            source.get("file_description", ""),
            first_name,
            str(source.get("_highlight", "")),
        ]).lower()

        # Check for specific event types (most specific first)
        if any(kw in text for kw in ["bankruptcy", "chapter 11", "chapter 7", "insolvency"]):
            if "chapter 7" in text:
                return "bankruptcy_ch7"
            return "bankruptcy_ch11"
        if any(kw in text for kw in ["merger", "acquisition", "acquire", "business combination"]):
            return "merger"
        if any(kw in text for kw in ["asset sale", "asset disposal", "divestiture"]):
            return "liquidation"
        if any(kw in text for kw in [
            "facility closure", "plant closing", "office closure",
            "site closure", "office consolidation", "lease termination",
            "exit activities", "disposal activities",
        ]):
            return "facility_shutdown"
        if any(kw in text for kw in [
            "workforce reduction", "layoff", "headcount reduction", "severance",
        ]):
            return "layoff"
        if any(kw in text for kw in ["ceasing operations", "wind down", "dissolution"]):
            return "ceasing_operations"
        if any(kw in text for kw in [
            "impairment charge", "goodwill impairment", "asset impairment",
            "material impairment", "write-down", "long-lived asset",
        ]):
            return "restructuring"
        return "restructuring"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _search_filings(self) -> list[dict]:
        """Search recent 8-K filings via EDGAR full-text search API.

        Covers Items 1.01, 1.03, 2.01, 2.05 (exit/disposal), 2.06 (impairments).
        """
        headers = {"User-Agent": settings.sec_user_agent}

        # Expanded query covering original terms + Item 2.05/2.06 language
        query = (
            '"restructuring" OR "facility closure" OR "workforce reduction"'
            ' OR "merger" OR "asset sale" OR "ceasing operations"'
            ' OR "exit activities" OR "disposal activities"'
            ' OR "restructuring charges" OR "lease termination"'
            ' OR "impairment charge" OR "asset impairment"'
        )

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params={"q": query, "forms": "8-K"},
                headers=headers,
            )

            if resp.status_code == 200:
                return resp.json().get("hits", {}).get("hits", [])

            # Fallback: use the submissions API for recent filings
            return await self._get_recent_8k_filings()

    async def _get_recent_8k_filings(self) -> list[dict]:
        """Fallback: query recent 8-K filings from EDGAR."""
        headers = {"User-Agent": settings.sec_user_agent}
        url = "https://efts.sec.gov/LATEST/search-index?q=%22restructuring%22&forms=8-K"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params={"q": "restructuring", "forms": "8-K"},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("hits", {}).get("hits", [])
        return []

    async def collect(self) -> list[dict]:
        signals = []

        try:
            filings = await self._search_filings()
            for filing in filings[:50]:
                source = filing.get("_source", filing)
                company_name = source.get("display_names", [{}])
                if isinstance(company_name, list) and company_name:
                    company_name = company_name[0] if isinstance(company_name[0], str) else company_name[0].get("name", "")
                elif isinstance(company_name, str):
                    pass
                else:
                    company_name = source.get("entity_name", "")

                # Strip embedded ticker/CIK patterns like "(TER)  (CIK 0000097210)"
                company_name = re.sub(r'\s*\([A-Z]{1,5}\)\s*', ' ', str(company_name))
                company_name = re.sub(r'\s*\(CIK \d+\)\s*', '', company_name)
                company_name = re.sub(r'\s*/[A-Z]{2,3}/\s*', ' ', company_name)
                company_name = re.sub(r'\s{2,}', ' ', company_name).strip()

                if not company_name or company_name.lower() == "unknown":
                    logger.debug("sec_edgar.skipped_no_company", filing=source.get("accession_no"))
                    continue

                filing_date = source.get("file_date") or source.get("period_of_report")
                event_date = None
                if filing_date:
                    try:
                        event_date = datetime.strptime(filing_date[:10], "%Y-%m-%d").date()
                    except ValueError:
                        pass

                file_url = source.get("file_url", "")
                if not file_url:
                    accession = source.get("accession_no", "").replace("-", "")
                    if accession:
                        file_url = f"https://www.sec.gov/Archives/edgar/data/{source.get('ciks', [''])[0]}/{accession}"

                event_type = self._classify_filing(source)

                # Include highlight text for better NLP context
                highlight = str(source.get("_highlight", ""))[:300]
                raw_text = f"8-K filing: {company_name}"
                if highlight:
                    raw_text = f"8-K filing: {company_name} — {highlight}"

                signals.append({
                    "company_name": str(company_name)[:500],
                    "event_type": event_type,
                    "event_date": event_date,
                    "employees_affected": None,
                    "locations": [],
                    "source_url": file_url or "https://www.sec.gov/cgi-bin/browse-edgar",
                    "raw_text": raw_text[:800],
                })

                # Rate limit: 10 req/sec per SEC guidelines
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error("sec_edgar.collection_failed", error=str(e))
            raise

        logger.info("sec_edgar.collected", count=len(signals))
        return signals
