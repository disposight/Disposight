"""Tests for admin email override in auth and deps."""

from app.api.v1.auth import get_me
from app.api.v1.deps import get_tenant_info


# ---------------------------------------------------------------------------
# Admin email list — now driven by ADMIN_EMAILS env var, not hardcoded
# ---------------------------------------------------------------------------

def test_admin_override_in_auth():
    """Verify the admin override logic is present in auth.py."""
    import inspect
    source = inspect.getsource(get_me)
    assert "admin_emails" in source
    assert "settings.admin_emails" in source


def test_admin_override_in_deps():
    """Verify the admin override logic is present in deps.py."""
    import inspect
    source = inspect.getsource(get_tenant_info)
    assert "admin_emails" in source
    assert "settings.admin_emails" in source
