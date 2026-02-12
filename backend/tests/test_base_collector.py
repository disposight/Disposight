"""Tests for BaseCollector utility methods."""

from app.ingestion.base import BaseCollector


class TestContentHash:
    def setup_method(self):
        # Create a minimal concrete subclass for testing
        class DummyCollector(BaseCollector):
            source_name = "test"
            source_type = "test"
            async def collect(self):
                return []

        self.collector = DummyCollector.__new__(DummyCollector)

    def test_hash_deterministic(self):
        item = {"company_name": "Acme", "event_type": "layoff", "event_date": "2025-01-01", "source_url": "http://example.com"}
        h1 = self.collector._compute_hash(item)
        h2 = self.collector._compute_hash(item)
        assert h1 == h2

    def test_different_items_different_hash(self):
        item1 = {"company_name": "Acme", "event_type": "layoff", "event_date": "2025-01-01", "source_url": "http://a.com"}
        item2 = {"company_name": "Beta", "event_type": "layoff", "event_date": "2025-01-01", "source_url": "http://a.com"}
        assert self.collector._compute_hash(item1) != self.collector._compute_hash(item2)

    def test_hash_is_sha256_hex(self):
        item = {"company_name": "Test", "event_type": "merger"}
        h = self.collector._compute_hash(item)
        assert len(h) == 64  # SHA-256 hex digest
        assert all(c in "0123456789abcdef" for c in h)

    def test_missing_optional_fields(self):
        item = {"company_name": "Test", "event_type": "merger"}
        h = self.collector._compute_hash(item)
        assert isinstance(h, str)

    def test_same_company_different_type(self):
        item1 = {"company_name": "Acme", "event_type": "layoff"}
        item2 = {"company_name": "Acme", "event_type": "merger"}
        assert self.collector._compute_hash(item1) != self.collector._compute_hash(item2)

    def test_same_company_different_date(self):
        item1 = {"company_name": "Acme", "event_type": "layoff", "event_date": "2025-01-01"}
        item2 = {"company_name": "Acme", "event_type": "layoff", "event_date": "2025-02-01"}
        assert self.collector._compute_hash(item1) != self.collector._compute_hash(item2)
