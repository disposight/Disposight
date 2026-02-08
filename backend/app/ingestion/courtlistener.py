from datetime import datetime, timedelta

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

COURTLISTENER_API = "https://www.courtlistener.com/api/rest/v4"


class CourtListenerCollector(BaseCollector):
    source_name = "CourtListener"
    source_type = "courtlistener"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _search_bankruptcies(self) -> list[dict]:
        """Search for recent bankruptcy dockets via CourtListener Dockets API."""
        if not settings.courtlistener_api_key:
            logger.warning("courtlistener.no_api_key", msg="Set COURTLISTENER_API_KEY for access")
            return []

        headers = {
            "User-Agent": "DispoSight/1.0 contact@disposight.com",
            "Authorization": f"Token {settings.courtlistener_api_key}",
        }

        since = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{COURTLISTENER_API}/dockets/",
                params={
                    "court__jurisdiction": "FB",
                    "date_filed__gte": since,
                    "ordering": "-date_filed",
                },
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", [])

    async def collect(self) -> list[dict]:
        signals = []

        try:
            results = await self._search_bankruptcies()

            for result in results:
                case_name = result.get("case_name", "")
                if not case_name:
                    continue

                # Filter out personal bankruptcies
                name_lower = case_name.lower()
                corp_indicators = ["inc", "llc", "corp", "ltd", "co.", "company", "group", "holdings", "enterprises"]
                is_corporate = any(ind in name_lower for ind in corp_indicators)
                if not is_corporate:
                    continue

                filed_date = result.get("date_filed")
                event_date = None
                if filed_date:
                    try:
                        event_date = datetime.strptime(filed_date[:10], "%Y-%m-%d").date()
                    except ValueError:
                        pass

                absolute_url = result.get("absolute_url", "")
                source_url = f"https://www.courtlistener.com{absolute_url}" if absolute_url else ""
                docket_number = result.get("docket_number", "")

                # Default to ch11 for corporate filings
                event_type = "bankruptcy_ch11"

                signals.append({
                    "company_name": case_name[:500],
                    "event_type": event_type,
                    "event_date": event_date,
                    "employees_affected": None,
                    "locations": [],
                    "source_url": source_url,
                    "raw_text": f"Bankruptcy filing: {case_name} (Docket: {docket_number})",
                })

        except Exception as e:
            logger.error("courtlistener.collection_failed", error=str(e))
            raise

        logger.info("courtlistener.collected", count=len(signals))
        return signals
