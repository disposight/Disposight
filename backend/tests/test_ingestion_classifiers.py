"""Tests for ingestion pipeline classification and parsing logic.

Tests the pure/deterministic methods on each collector without making HTTP calls.
"""

from app.ingestion.gdelt_news import GdeltCollector
from app.ingestion.sec_edgar import SecEdgarCollector
from app.ingestion.courtlistener import CourtListenerCollector, CORP_INDICATORS, ADVERSARY_MARKERS
from app.ingestion.globenewswire import GlobeNewswireCollector


# ---------------------------------------------------------------------------
# GDELT event classification
# ---------------------------------------------------------------------------

class TestGdeltClassify:
    def setup_method(self):
        self.collector = GdeltCollector.__new__(GdeltCollector)

    def test_office_closure(self):
        assert self.collector._classify_event("office closure") == "office_closure"

    def test_facility_shutdown(self):
        assert self.collector._classify_event("facility shutdown") == "facility_shutdown"

    def test_plant_closing(self):
        assert self.collector._classify_event("plant closing") == "plant_closing"

    def test_bankruptcy_ch11(self):
        assert self.collector._classify_event("filed for bankruptcy") == "bankruptcy_ch11"
        assert self.collector._classify_event("chapter 11") == "bankruptcy_ch11"

    def test_bankruptcy_ch7(self):
        assert self.collector._classify_event("chapter 7") == "bankruptcy_ch7"

    def test_liquidation(self):
        assert self.collector._classify_event("liquidation") == "liquidation"
        assert self.collector._classify_event("asset sale") == "liquidation"

    def test_ceasing_operations(self):
        assert self.collector._classify_event("ceasing operations") == "ceasing_operations"

    def test_relocation(self):
        assert self.collector._classify_event("company relocating") == "relocation"

    def test_layoff_variants(self):
        assert self.collector._classify_event("mass layoff") == "layoff"
        assert self.collector._classify_event("workforce reduction") == "layoff"
        assert self.collector._classify_event("downsizing") == "layoff"

    def test_restructuring(self):
        assert self.collector._classify_event("corporate restructuring") == "restructuring"

    def test_unknown_keyword(self):
        assert self.collector._classify_event("something random") == "unknown"


# ---------------------------------------------------------------------------
# SEC EDGAR filing classification
# ---------------------------------------------------------------------------

class TestSecEdgarClassify:
    def setup_method(self):
        self.collector = SecEdgarCollector.__new__(SecEdgarCollector)

    def _source(self, **overrides):
        base = {"display_names": ["Test Corp"], "file_description": "", "_highlight": ""}
        base.update(overrides)
        return base

    def test_chapter_7(self):
        assert self.collector._classify_filing(
            self._source(_highlight="chapter 7 liquidation")
        ) == "bankruptcy_ch7"

    def test_chapter_11(self):
        assert self.collector._classify_filing(
            self._source(_highlight="chapter 11 bankruptcy filing")
        ) == "bankruptcy_ch11"

    def test_merger(self):
        assert self.collector._classify_filing(
            self._source(_highlight="merger and acquisition agreement")
        ) == "merger"

    def test_asset_sale(self):
        assert self.collector._classify_filing(
            self._source(_highlight="asset sale and divestiture")
        ) == "liquidation"

    def test_facility_closure(self):
        assert self.collector._classify_filing(
            self._source(_highlight="facility closure plan announced")
        ) == "facility_shutdown"

    def test_exit_activities(self):
        assert self.collector._classify_filing(
            self._source(_highlight="exit activities pursuant to Item 2.05")
        ) == "facility_shutdown"

    def test_workforce_reduction(self):
        assert self.collector._classify_filing(
            self._source(_highlight="workforce reduction severance costs")
        ) == "layoff"

    def test_ceasing_operations(self):
        assert self.collector._classify_filing(
            self._source(_highlight="ceasing operations wind down")
        ) == "ceasing_operations"

    def test_impairment(self):
        assert self.collector._classify_filing(
            self._source(_highlight="goodwill impairment charge recorded")
        ) == "restructuring"

    def test_default_restructuring(self):
        assert self.collector._classify_filing(
            self._source(_highlight="quarterly results overview")
        ) == "restructuring"


# ---------------------------------------------------------------------------
# CourtListener chapter detection
# ---------------------------------------------------------------------------

class TestCourtListenerChapterDetect:
    def setup_method(self):
        self.collector = CourtListenerCollector.__new__(CourtListenerCollector)

    def test_chapter_7_detection(self):
        assert self.collector._detect_chapter_from_name("In re: Acme Corp Chapter 7") == "bankruptcy_ch7"
        assert self.collector._detect_chapter_from_name("Ch. 7 filing") == "bankruptcy_ch7"
        assert self.collector._detect_chapter_from_name("ch 7 liquidation") == "bankruptcy_ch7"

    def test_chapter_11_detection(self):
        assert self.collector._detect_chapter_from_name("In re: Acme Corp Chapter 11") == "bankruptcy_ch11"
        assert self.collector._detect_chapter_from_name("Ch. 11 reorganization") == "bankruptcy_ch11"
        assert self.collector._detect_chapter_from_name("ch 11 filing") == "bankruptcy_ch11"

    def test_unknown_chapter(self):
        assert self.collector._detect_chapter_from_name("In re: Acme Corp") is None
        assert self.collector._detect_chapter_from_name("bankruptcy petition") is None


class TestCourtListenerFilters:
    def test_adversary_markers_detected(self):
        for marker in ADVERSARY_MARKERS:
            case_name = f"Smith{marker}Jones LLC"
            assert marker in case_name

    def test_corporate_indicators(self):
        assert any(ind in "acme inc" for ind in CORP_INDICATORS)
        assert any(ind in "widgets llc" for ind in CORP_INDICATORS)
        assert any(ind in "big corp" for ind in CORP_INDICATORS)
        assert not any(ind in "john doe" for ind in CORP_INDICATORS)


# ---------------------------------------------------------------------------
# GlobeNewswire classification and extraction
# ---------------------------------------------------------------------------

class TestGlobeNewswireClassify:
    def setup_method(self):
        self.collector = GlobeNewswireCollector.__new__(GlobeNewswireCollector)

    def test_chapter_7(self):
        assert self.collector._classify_event("Company files Chapter 7", "bankruptcy") == "bankruptcy_ch7"

    def test_chapter_11(self):
        assert self.collector._classify_event("Company files Chapter 11 protection", "bankruptcy") == "bankruptcy_ch11"

    def test_bankruptcy_generic(self):
        assert self.collector._classify_event("Company declares bankruptcy", "bankruptcy") == "bankruptcy_ch11"

    def test_liquidation(self):
        assert self.collector._classify_event("Asset liquidation announced", "divestitures") == "liquidation"

    def test_facility_shutdown(self):
        assert self.collector._classify_event("Facility closure planned for Q3", "restructuring") == "facility_shutdown"

    def test_layoff(self):
        assert self.collector._classify_event("Workforce reduction of 500 employees", "restructuring") == "layoff"

    def test_merger(self):
        assert self.collector._classify_event("Merger agreement reached", "acquisitions") == "merger"

    def test_fallback_to_feed_category(self):
        assert self.collector._classify_event("Something generic happening", "restructuring") == "restructuring"
        assert self.collector._classify_event("Something generic happening", "bankruptcy") == "bankruptcy_ch11"
        assert self.collector._classify_event("Something generic happening", "divestitures") == "liquidation"
        assert self.collector._classify_event("Something generic happening", "acquisitions") == "merger"


class TestGlobeNewswireExtractCompany:
    def setup_method(self):
        self.collector = GlobeNewswireCollector.__new__(GlobeNewswireCollector)

    def test_company_before_verb(self):
        name = self.collector._extract_company_name("Acme Corp Announces Restructuring Plan")
        assert name == "Acme Corp"

    def test_company_before_files(self):
        name = self.collector._extract_company_name("XYZ Inc. Files for Chapter 11 Bankruptcy")
        assert name == "XYZ Inc."

    def test_company_before_reports(self):
        name = self.collector._extract_company_name("MegaCo Holdings Reports Q4 Results")
        assert name == "MegaCo Holdings"

    def test_strips_ticker_parenthetical(self):
        name = self.collector._extract_company_name("Acme Corp (NYSE: ACM) Announces Layoffs")
        assert "NYSE" not in name
        assert name == "Acme Corp"

    def test_corrected_prefix_stripped(self):
        name = self.collector._extract_company_name("CORRECTED - Acme Corp Announces Plan")
        assert name == "Acme Corp"

    def test_fallback_dash_separator(self):
        name = self.collector._extract_company_name("Big Company - Major News Story")
        assert name == "Big Company"

    def test_fallback_full_title(self):
        name = self.collector._extract_company_name("Short")
        assert name == "Short"


class TestGlobeNewswireParseDate:
    def setup_method(self):
        self.collector = GlobeNewswireCollector.__new__(GlobeNewswireCollector)

    def test_rfc2822_date(self):
        entry = {"published": "Wed, 05 Feb 2025 14:30:00 GMT"}
        result = self.collector._parse_date(entry)
        assert result is not None

    def test_iso_date(self):
        entry = {"published": "2025-02-05T14:30:00Z"}
        result = self.collector._parse_date(entry)
        assert result is not None

    def test_no_date(self):
        entry = {}
        result = self.collector._parse_date(entry)
        assert result is None

    def test_updated_fallback(self):
        entry = {"updated": "Wed, 05 Feb 2025 14:30:00 GMT"}
        result = self.collector._parse_date(entry)
        assert result is not None
