from datetime import datetime, timedelta

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

COURTLISTENER_API = "https://www.courtlistener.com/api/rest/v4"

# Major bankruptcy courts to search
BANKRUPTCY_COURTS = "njb nysb nyeb deb dcd txsb txnb casb canb ilnb flsb flmb"

# Corporate indicators for filtering out personal bankruptcies
CORP_INDICATORS = ["inc", "llc", "corp", "ltd", "co.", "company", "group", "holdings", "enterprises", "lp"]

# Terms that indicate adversary proceedings / lawsuits rather than direct filings
ADVERSARY_MARKERS = [" v. ", " vs. ", " vs "]


class CourtListenerCollector(BaseCollector):
    source_name = "CourtListener"
    source_type = "courtlistener"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _search_bankruptcies(self) -> list[dict]:
        """Search for recent corporate bankruptcy filings via CourtListener RECAP search."""
        if not settings.courtlistener_api_key:
            logger.warning("courtlistener.no_api_key", msg="Set COURTLISTENER_API_KEY for access")
            return []

        headers = {
            "User-Agent": "DispoSight/1.0 contact@disposight.com",
            "Authorization": f"Token {settings.courtlistener_api_key}",
        }

        since = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        all_results = []
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{COURTLISTENER_API}/search/",
                params={
                    "type": "r",  # RECAP dockets
                    "court": BANKRUPTCY_COURTS,
                    "filed_after": since,
                    "q": "LLC OR Inc OR Corp OR Company OR Holdings OR Enterprises",
                    "order_by": "dateFiled desc",
                },
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            all_results.extend(data.get("results", []))

        return all_results

    async def collect(self) -> list[dict]:
        signals = []

        try:
            results = await self._search_bankruptcies()

            for result in results:
                case_name = result.get("caseName", "") or result.get("case_name", "")
                if not case_name:
                    continue

                # Skip adversary proceedings (lawsuits between parties)
                if any(m in case_name for m in ADVERSARY_MARKERS):
                    continue

                # Verify corporate indicator is in the case name
                name_lower = case_name.lower()
                is_corporate = any(ind in name_lower for ind in CORP_INDICATORS)
                if not is_corporate:
                    continue

                filed_date = result.get("dateFiled") or result.get("date_filed")
                event_date = None
                if filed_date:
                    try:
                        event_date = datetime.strptime(filed_date[:10], "%Y-%m-%d").date()
                    except ValueError:
                        pass

                absolute_url = result.get("absolute_url", "")
                source_url = f"https://www.courtlistener.com{absolute_url}" if absolute_url else ""
                docket_number = result.get("docket_number") or result.get("docketNumber", "")
                court = result.get("court", "")

                # Default to ch11 for corporate filings
                event_type = "bankruptcy_ch11"

                signals.append({
                    "company_name": case_name[:500],
                    "event_type": event_type,
                    "event_date": event_date,
                    "employees_affected": None,
                    "locations": [],
                    "source_url": source_url,
                    "raw_text": f"Bankruptcy filing: {case_name} (Docket: {docket_number}, Court: {court})",
                })

        except Exception as e:
            logger.error("courtlistener.collection_failed", error=str(e))
            raise

        logger.info("courtlistener.collected", count=len(signals))
        return signals
