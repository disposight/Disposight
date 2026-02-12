"""Tests for WARN Act parsing logic."""

import io
from datetime import datetime

from app.ingestion.warn_act import WarnActCollector


class TestCaliforniaParser:
    def setup_method(self):
        self.collector = WarnActCollector.__new__(WarnActCollector)

    def _make_xlsx(self, rows):
        """Create a minimal XLSX in memory for testing."""
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Detailed WARN Report "
        # Row 0: title
        ws.append(["WARN Report"])
        # Row 1: headers
        ws.append(["County/Parish", "Notice Date", "Processed Date", "Effective Date",
                    "Company", "Layoff/Closure", "No. Of Employees", "Address"])
        for row in rows:
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def test_parse_basic_row(self):
        xlsx = self._make_xlsx([
            ["Alameda County", datetime(2025, 1, 15), None, datetime(2025, 2, 1),
             "Acme Corp", "Layoff", 250, "123 Main St  Oakland CA 94601"]
        ])
        results = self.collector._parse_california_xlsx(xlsx)
        assert len(results) == 1
        assert results[0]["company_name"] == "Acme Corp"
        assert results[0]["employees_affected"] == 250
        assert results[0]["event_type"] == "layoff"

    def test_closure_type(self):
        xlsx = self._make_xlsx([
            ["LA County", datetime(2025, 1, 15), None, datetime(2025, 2, 1),
             "Widget Inc", "Closure", 100, "456 Oak Ave  Los Angeles CA 90001"]
        ])
        results = self.collector._parse_california_xlsx(xlsx)
        assert results[0]["event_type"] == "facility_shutdown"

    def test_skip_empty_company(self):
        xlsx = self._make_xlsx([
            ["County", datetime(2025, 1, 15), None, datetime(2025, 2, 1),
             "", "Layoff", 100, "Address"]
        ])
        results = self.collector._parse_california_xlsx(xlsx)
        assert len(results) == 0

    def test_parse_string_employees(self):
        xlsx = self._make_xlsx([
            ["County", datetime(2025, 1, 15), None, datetime(2025, 2, 1),
             "Test Corp", "Layoff", "1,500", "Address  City CA 99999"]
        ])
        results = self.collector._parse_california_xlsx(xlsx)
        assert results[0]["employees_affected"] == 1500

    def test_multiple_rows(self):
        xlsx = self._make_xlsx([
            ["County A", datetime(2025, 1, 1), None, datetime(2025, 2, 1),
             "Corp A", "Layoff", 200, "Addr  City CA 90001"],
            ["County B", datetime(2025, 1, 2), None, datetime(2025, 2, 2),
             "Corp B", "Closure", 500, "Addr  City CA 90002"],
            ["County C", datetime(2025, 1, 3), None, datetime(2025, 2, 3),
             "Corp C", "Layoff", 75, "Addr  City CA 90003"],
        ])
        results = self.collector._parse_california_xlsx(xlsx)
        assert len(results) == 3
        assert results[1]["event_type"] == "facility_shutdown"

    def test_missing_sheet_returns_empty(self):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Wrong Sheet Name"
        ws.append(["data"])
        buf = io.BytesIO()
        wb.save(buf)
        results = self.collector._parse_california_xlsx(buf.getvalue())
        assert results == []
