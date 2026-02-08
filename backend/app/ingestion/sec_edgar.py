import asyncio
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
]


class SecEdgarCollector(BaseCollector):
    source_name = "SEC EDGAR"
    source_type = "sec_edgar"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _search_filings(self) -> list[dict]:
        """Search recent 8-K filings via EDGAR full-text search API."""
        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": '"restructuring" OR "asset sale" OR "workforce reduction" OR "facility closure"',
            "dateRange": "custom",
            "startdt": (datetime.now().date().isoformat()),
            "forms": "8-K",
            "hits.hits.total": "50",
        }
        headers = {"User-Agent": settings.sec_user_agent}

        async with httpx.AsyncClient(timeout=30) as client:
            # Use EDGAR full-text search
            resp = await client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params={
                    "q": '"restructuring" OR "facility closure" OR "workforce reduction"',
                    "forms": "8-K",
                },
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
                    company_name = source.get("entity_name", "Unknown")

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

                signals.append({
                    "company_name": str(company_name)[:500],
                    "event_type": "restructuring",
                    "event_date": event_date,
                    "employees_affected": None,
                    "locations": [],
                    "source_url": file_url or "https://www.sec.gov/cgi-bin/browse-edgar",
                    "raw_text": f"8-K filing: {company_name}",
                })

                # Rate limit: 10 req/sec per SEC guidelines
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error("sec_edgar.collection_failed", error=str(e))
            raise

        logger.info("sec_edgar.collected", count=len(signals))
        return signals
