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
        """Search for recent bankruptcy filings via CourtListener API."""
        headers = {}
        if settings.courtlistener_api_key:
            headers["Authorization"] = f"Token {settings.courtlistener_api_key}"

        # Search for bankruptcy opinions in the last 24 hours
        since = (datetime.now() - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{COURTLISTENER_API}/search/",
                params={
                    "type": "o",  # opinions
                    "court": "bap1 bap2 bap6 bap8 bap9 bap10",  # bankruptcy appellate panels
                    "filed_after": since,
                    "order_by": "dateFiled desc",
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
                case_name = result.get("caseName", "") or result.get("case_name", "")
                if not case_name:
                    continue

                # Filter out personal bankruptcies (heuristic: look for corporate indicators)
                name_lower = case_name.lower()
                personal_indicators = [" v. ", "in re: ", "estate of"]
                corp_indicators = ["inc", "llc", "corp", "ltd", "co.", "company", "group"]

                is_corporate = any(ind in name_lower for ind in corp_indicators)
                if not is_corporate:
                    continue

                filed_date = result.get("dateFiled") or result.get("date_filed")
                event_date = None
                if filed_date:
                    try:
                        event_date = datetime.strptime(filed_date[:10], "%Y-%m-%d").date()
                    except ValueError:
                        pass

                court = result.get("court", "")
                absolute_url = result.get("absolute_url", "")
                source_url = f"https://www.courtlistener.com{absolute_url}" if absolute_url else ""

                # Determine bankruptcy type from case text
                text = (result.get("snippet", "") or "").lower()
                if "chapter 7" in text or "liquidation" in text:
                    event_type = "bankruptcy_ch7"
                else:
                    event_type = "bankruptcy_ch11"

                signals.append({
                    "company_name": case_name[:500],
                    "event_type": event_type,
                    "event_date": event_date,
                    "employees_affected": None,  # Not available from court data
                    "locations": [],
                    "source_url": source_url,
                    "raw_text": f"Bankruptcy filing: {case_name} ({court})",
                })

        except Exception as e:
            logger.error("courtlistener.collection_failed", error=str(e))
            raise

        logger.info("courtlistener.collected", count=len(signals))
        return signals
