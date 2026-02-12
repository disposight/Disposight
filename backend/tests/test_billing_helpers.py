"""Tests for billing helper functions (price mapping, resolution)."""

from unittest.mock import patch

from app.api.v1.billing import _price_to_plan, _resolve_price_id


# Mock settings to avoid needing real env vars
MOCK_SETTINGS = {
    "stripe_starter_price_id": "price_starter_123",
    "stripe_pro_price_id": "price_pro_456",
    "stripe_starter_yearly_price_id": "price_starter_yearly_789",
    "stripe_pro_yearly_price_id": "price_pro_yearly_012",
}


def _patch_settings():
    """Return a patch context that sets billing-related settings."""
    from app.config import settings
    return patch.multiple(settings, **MOCK_SETTINGS)


# ---------------------------------------------------------------------------
# _price_to_plan
# ---------------------------------------------------------------------------

def test_price_to_plan_starter():
    with _patch_settings():
        assert _price_to_plan("price_starter_123") == "starter"


def test_price_to_plan_pro():
    with _patch_settings():
        assert _price_to_plan("price_pro_456") == "pro"


def test_price_to_plan_starter_yearly():
    with _patch_settings():
        assert _price_to_plan("price_starter_yearly_789") == "starter"


def test_price_to_plan_pro_yearly():
    with _patch_settings():
        assert _price_to_plan("price_pro_yearly_012") == "pro"


def test_price_to_plan_unknown_defaults_to_starter():
    with _patch_settings():
        assert _price_to_plan("price_unknown_999") == "starter"


# ---------------------------------------------------------------------------
# _resolve_price_id
# ---------------------------------------------------------------------------

def test_resolve_friendly_starter():
    with _patch_settings():
        assert _resolve_price_id("starter") == "price_starter_123"


def test_resolve_friendly_pro():
    with _patch_settings():
        assert _resolve_price_id("pro") == "price_pro_456"


def test_resolve_friendly_starter_yearly():
    with _patch_settings():
        assert _resolve_price_id("starter_yearly") == "price_starter_yearly_789"


def test_resolve_friendly_pro_yearly():
    with _patch_settings():
        assert _resolve_price_id("pro_yearly") == "price_pro_yearly_012"


def test_resolve_raw_price_id_passthrough():
    with _patch_settings():
        assert _resolve_price_id("price_existing_abc") == "price_existing_abc"
