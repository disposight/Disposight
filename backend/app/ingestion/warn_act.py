import io
import re
from datetime import datetime

import httpx
import openpyxl
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ingestion.base import BaseCollector

logger = structlog.get_logger()

# California EDD publishes WARN data as XLSX (updated Tue/Thu)
CA_WARN_URL = "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx"
# Sheet name for detailed data (has trailing space in the actual file)
CA_SHEET_NAME = "Detailed WARN Report "


class WarnActCollector(BaseCollector):
    source_name = "WARN Act (data.gov)"
    source_type = "warn_act"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=16))
    async def _fetch_xlsx(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    async def collect(self) -> list[dict]:
        signals = []

        try:
            xlsx_bytes = await self._fetch_xlsx(CA_WARN_URL)
            signals.extend(self._parse_california_xlsx(xlsx_bytes))
            logger.info("warn_act.california_fetched", count=len(signals))
        except Exception as e:
            logger.warning("warn_act.california_failed", error=str(e))

        return signals

    def _parse_california_xlsx(self, xlsx_bytes: bytes) -> list[dict]:
        results = []
        wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True)

        # Find the detailed report sheet
        ws = None
        for name in wb.sheetnames:
            if "detailed" in name.lower() and "warn" in name.lower():
                ws = wb[name]
                break
        if ws is None:
            logger.warning("warn_act.sheet_not_found", sheets=wb.sheetnames)
            wb.close()
            return results

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 3:
            wb.close()
            return results

        # Row 0 is title, row 1 is headers
        # Headers: County/Parish, Notice Date, Processed Date, Effective Date, Company, Layoff/Closure, No. Of Employees, Address, Related Industry
        for row in rows[2:]:
            try:
                if len(row) < 7:
                    continue

                county = row[0]
                notice_date = row[1]
                effective_date = row[3]
                company_name = row[4]
                layoff_type = row[5]
                employees = row[6]
                address = row[7] if len(row) > 7 else ""

                if not company_name:
                    continue
                company_name = str(company_name).strip()

                # Parse employees
                emp_count = 0
                if employees is not None:
                    try:
                        emp_count = int(str(employees).replace(",", "").strip())
                    except (ValueError, TypeError):
                        emp_count = 0

                # Parse date
                event_date = None
                date_val = effective_date or notice_date
                if isinstance(date_val, datetime):
                    event_date = date_val.date()
                elif isinstance(date_val, str) and date_val.strip():
                    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
                        try:
                            event_date = datetime.strptime(date_val.strip(), fmt).date()
                            break
                        except ValueError:
                            continue

                # Extract city from address (format: "30825 Wiegman Road  Hayward CA 94544")
                # Use double-space as delimiter — EDD formats as "Street  City CA Zip"
                city = ""
                if address and isinstance(address, str):
                    # Split on double-space which separates street from city
                    addr_parts = re.split(r"\s{2,}", address.strip())
                    if len(addr_parts) >= 2:
                        # Last segment before zip is "City CA 94544"
                        city_state = addr_parts[-1].strip()
                        # Remove "CA" and zip
                        city = re.sub(r"\s+CA\s+\d{5}(-\d{4})?$", "", city_state).strip()
                    if not city:
                        # Fallback: take 1-2 words before "CA"
                        parts = address.strip().split()
                        for i, part in enumerate(parts):
                            if part == "CA" and i > 0:
                                city = parts[i - 1]
                                if i > 1 and parts[i - 2][0].isupper() and not parts[i - 2][0].isdigit():
                                    city = parts[i - 2] + " " + city
                                break

                event_type = "layoff"
                if layoff_type and "closure" in str(layoff_type).lower():
                    event_type = "facility_shutdown"

                results.append({
                    "company_name": company_name,
                    "event_type": event_type,
                    "event_date": event_date,
                    "employees_affected": emp_count,
                    "locations": [{"city": city, "state": "CA", "county": str(county or "").replace(" County", "")}] if county else [],
                    "source_url": CA_WARN_URL,
                    "raw_text": f"WARN notice: {company_name}, {emp_count} employees, {county or 'CA'}, {event_type}",
                })
            except Exception as e:
                logger.warning("warn_act.parse_error", error=str(e))
                continue

        wb.close()
        return results
