"""GlobeNewswire RSS collector for corporate restructuring and bankruptcy press releases.

GlobeNewswire provides free RSS feeds categorized by subject code. Companies self-announce
restructurings, closures, and bankruptcies via press releases — often before news coverage.
This is a primary-source feed with high signal quality.
"""

import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

# GlobeNewswire RSS feeds by subject code (free, no auth required)
RSS_FEEDS = {
    "restructuring": "https://www.globenewswire.com/RssFeed/subjectcode/25-Restructuring/feedTitle/GlobeNewswire%20-%20Restructuring",
    "bankruptcy": "https://www.globenewswire.com/RssFeed/subjectcode/26-Bankruptcy/feedTitle/GlobeNewswire%20-%20Bankruptcy",
    "divestitures": "https://www.globenewswire.com/RssFeed/subjectcode/18-Divestitures/feedTitle/GlobeNewswire%20-%20Divestitures",
    "acquisitions": "https://www.globenewswire.com/RssFeed/subjectcode/01-Acquisitions/feedTitle/GlobeNewswire%20-%20Acquisitions%20Mergers",
}

# Keywords for event classification (checked against title + summary)
CLASSIFICATION_PATTERNS = [
    (r"chapter\s*7", "bankruptcy_ch7"),
    (r"chapter\s*11", "bankruptcy_ch11"),
    (r"bankruptcy|insolvency", "bankruptcy_ch11"),
    (r"liquidat", "liquidation"),
    (r"ceasing operations|wind.?down|dissolution", "ceasing_operations"),
    (r"facility.*(clos|shut)|plant.*(clos|shut)|office.*(clos|shut)", "facility_shutdown"),
    (r"layoff|workforce reduction|headcount|job.?cut|rif\b", "layoff"),
    (r"merger|acqui|business combination", "merger"),
    (r"divestiture|asset sale|dispose|disposition", "liquidation"),
    (r"relocat", "relocation"),
]


class GlobeNewswireCollector(BaseCollector):
    source_name = "GlobeNewswire"
    source_type = "globenewswire"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _fetch_feed(self, url: str) -> list[dict]:
        """Parse an RSS feed and return entry dicts."""
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            raise ValueError(f"Feed parse error: {feed.bozo_exception}")
        return feed.entries

    def _classify_event(self, text: str, feed_category: str) -> str:
        """Classify event type from title/summary text, with feed category as fallback."""
        text_lower = text.lower()
        for pattern, event_type in CLASSIFICATION_PATTERNS:
            if re.search(pattern, text_lower):
                return event_type

        # Fallback based on which feed the entry came from
        fallback_map = {
            "restructuring": "restructuring",
            "bankruptcy": "bankruptcy_ch11",
            "divestitures": "liquidation",
            "acquisitions": "merger",
        }
        return fallback_map.get(feed_category, "restructuring")

    def _extract_company_name(self, title: str) -> str:
        """Extract company name from press release title.

        PR titles typically start with the company name:
          "Acme Corp Announces Restructuring Plan"
          "XYZ Inc. Files for Chapter 11 Bankruptcy Protection"
        """
        # Remove common prefixes
        title = re.sub(r"^(CORRECTED?|UPDATE[D]?)\s*[-:–]\s*", "", title, flags=re.IGNORECASE)

        # Try to grab text before action verbs
        verb_pattern = (
            r"^(.+?)\s+(?:announces?|files?|reports?|completes?|enters?|seeks?|receives?"
            r"|commences?|initiates?|launches?|provides?|closes?|signs?|reaches?|agrees?)"
        )
        match = re.match(verb_pattern, title, re.IGNORECASE)
        if match:
            name = match.group(1).strip().rstrip(",;:-–")
            # Clean trailing parenthetical like "(NYSE: XYZ)"
            name = re.sub(r"\s*\(.*?\)\s*$", "", name).strip()
            if len(name) > 3:
                return name[:500]

        # Fallback: use first segment before a dash or colon
        for sep in (" - ", " – ", ": ", " — "):
            if sep in title:
                name = title.split(sep)[0].strip()
                name = re.sub(r"\s*\(.*?\)\s*$", "", name).strip()
                if len(name) > 3:
                    return name[:500]

        return title[:500]

    def _parse_date(self, entry: dict) -> datetime | None:
        """Extract publication date from feed entry."""
        for field in ("published", "updated"):
            raw = entry.get(field)
            if not raw:
                continue
            try:
                return parsedate_to_datetime(raw).date()
            except Exception:
                pass
            # Fallback: try ISO format
            try:
                return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
            except Exception:
                pass
        return None

    async def collect(self) -> list[dict]:
        signals = []
        seen_urls = set()

        for category, feed_url in RSS_FEEDS.items():
            try:
                entries = await self._fetch_feed(feed_url)
                logger.info(
                    "globenewswire.feed_fetched",
                    category=category,
                    entries=len(entries),
                )

                for entry in entries:
                    url = entry.get("link", "")
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)

                    title = entry.get("title", "")
                    summary = entry.get("summary", "")
                    combined_text = f"{title} {summary}"

                    company_name = self._extract_company_name(title)
                    event_type = self._classify_event(combined_text, category)
                    pub_date = self._parse_date(entry)

                    signals.append({
                        "company_name": company_name,
                        "event_type": event_type,
                        "event_date": pub_date,
                        "employees_affected": None,  # Press releases rarely have exact counts
                        "locations": [],
                        "source_url": url,
                        "raw_text": f"{title[:400]} (via GlobeNewswire/{category})",
                    })

            except Exception as e:
                logger.warning(
                    "globenewswire.feed_failed",
                    category=category,
                    error=str(e),
                )
                continue

        logger.info("globenewswire.collected", count=len(signals))
        return signals
