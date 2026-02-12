"""Tests for app configuration and settings."""

from app.config import Settings, settings


def test_settings_has_required_fields():
    """Ensure all critical settings fields exist."""
    assert hasattr(settings, "supabase_url")
    assert hasattr(settings, "database_url")
    assert hasattr(settings, "redis_url")
    assert hasattr(settings, "stripe_secret_key")
    assert hasattr(settings, "stripe_webhook_secret")
    assert hasattr(settings, "stripe_starter_price_id")
    assert hasattr(settings, "stripe_pro_price_id")
    assert hasattr(settings, "frontend_url")
    assert hasattr(settings, "sentry_dsn")


def test_default_api_prefix():
    assert settings.api_prefix == "/api/v1"


def test_default_app_name():
    assert settings.app_name == "DispoSight"


def test_settings_can_be_constructed():
    """Settings can be instantiated with defaults (may read local .env)."""
    s = Settings()
    assert s.app_name == "DispoSight"
    assert isinstance(s.debug, bool)
