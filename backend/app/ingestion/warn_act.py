import csv
import io
from datetime import date, datetime

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

# Priority states with data.gov WARN data endpoints
# These URLs point to the WARN Act datasets on data.gov
STATE_DATASETS = {
    "CA": "https://data.edd.ca.gov/api/views/ja6x-tigg/rows.csv?accessType=DOWNLOAD",
}

# State-specific WARN notice pages (HTML scraping fallback)
STATE_PAGES = {
    "NY": "https://dol.ny.gov/warn-notices",
    "TX": "https://www.twc.texas.gov/businesses/worker-adjustment-and-retraining-notification-warn-notices",
    "FL": "http://floridajobs.org/office-directory/division-of-workforce-services/workforce-programs/reemployment-and-emergency-assistance-coordination-team-react/warn-notices",
    "IL": "https://www.illinoisworknet.com/LayoffRecovery/Pages/WARNNotices.aspx",
}


class WarnActCollector(BaseCollector):
    source_name = "WARN Act (data.gov)"
    source_type = "warn_act"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _fetch_csv(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text

    async def collect(self) -> list[dict]:
        signals = []

        # California — richest WARN data via data.gov
        try:
            csv_text = await self._fetch_csv(STATE_DATASETS["CA"])
            signals.extend(self._parse_california_csv(csv_text))
            logger.info("warn_act.california_fetched", count=len(signals))
        except Exception as e:
            logger.warning("warn_act.california_failed", error=str(e))

        return signals

    def _parse_california_csv(self, csv_text: str) -> list[dict]:
        results = []
        reader = csv.DictReader(io.StringIO(csv_text))

        for row in reader:
            try:
                company_name = row.get("Company") or row.get("company_name", "")
                if not company_name:
                    continue

                employees_str = (
                    row.get("No. Of Employees")
                    or row.get("employees_affected")
                    or row.get("NumEmployees", "0")
                )
                employees = int(str(employees_str).replace(",", "").strip() or "0")

                # Parse date
                date_str = (
                    row.get("Effective Date")
                    or row.get("effective_date")
                    or row.get("EffectiveDate", "")
                )
                event_date = None
                if date_str:
                    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
                        try:
                            event_date = datetime.strptime(date_str.strip(), fmt).date()
                            break
                        except ValueError:
                            continue

                city = row.get("City") or row.get("city", "")
                state = "CA"

                results.append({
                    "company_name": company_name.strip(),
                    "event_type": "layoff",
                    "event_date": event_date,
                    "employees_affected": employees,
                    "locations": [{"city": city.strip(), "state": state}] if city else [],
                    "source_url": STATE_DATASETS["CA"],
                    "raw_text": f"WARN notice: {company_name}, {employees} employees, {city}, CA",
                })
            except Exception as e:
                logger.warning("warn_act.parse_error", error=str(e), row=str(row)[:200])
                continue

        return results
