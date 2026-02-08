from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

HIGH_INTENT_KEYWORDS = [
    "office closure",
    "facility shutdown",
    "plant closing",
    "filed for bankruptcy",
    "chapter 11",
    "liquidation",
    "ceasing operations",
    "company relocating",
]

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"


class GdeltCollector(BaseCollector):
    source_name = "GDELT News"
    source_type = "gdelt"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _search_gdelt(self, keyword: str) -> list[dict]:
        params = {
            "query": f'"{keyword}" sourcelang:eng',
            "mode": "ArtList",
            "maxrecords": "50",
            "format": "json",
            "timespan": "3h",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(GDELT_DOC_API, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("articles", [])

    async def collect(self) -> list[dict]:
        signals = []
        seen_urls = set()

        for keyword in HIGH_INTENT_KEYWORDS:
            try:
                articles = await self._search_gdelt(keyword)
                for article in articles:
                    url = article.get("url", "")
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)

                    title = article.get("title", "")
                    domain = article.get("domain", "")
                    date_str = article.get("seendate", "")

                    # Parse date (GDELT format: YYYYMMDDTHHMMSSz)
                    pub_date = None
                    if date_str:
                        try:
                            pub_date = datetime.strptime(
                                date_str[:8], "%Y%m%d"
                            ).date()
                        except ValueError:
                            pass

                    signals.append({
                        "company_name": title[:500],  # Will be refined by NLP
                        "event_type": self._classify_event(keyword),
                        "event_date": pub_date,
                        "employees_affected": None,
                        "locations": [],
                        "source_url": url,
                        "raw_text": f"{title} (via {domain})",
                    })
            except Exception as e:
                logger.warning("gdelt.keyword_failed", keyword=keyword, error=str(e))
                continue

        logger.info("gdelt.collected", total_articles=len(signals))
        return signals

    def _classify_event(self, keyword: str) -> str:
        mapping = {
            "office closure": "office_closure",
            "facility shutdown": "facility_shutdown",
            "plant closing": "plant_closing",
            "filed for bankruptcy": "bankruptcy_ch11",
            "chapter 11": "bankruptcy_ch11",
            "liquidation": "liquidation",
            "ceasing operations": "ceasing_operations",
            "company relocating": "relocation",
        }
        return mapping.get(keyword, "unknown")
