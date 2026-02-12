"""Tests for rate limiter key function."""

from unittest.mock import MagicMock

from app.rate_limit import _key_func


class _FakeHeaders(dict):
    """Dict subclass that allows .get override for mock requests."""
    pass


def _make_request(auth_header: str = "") -> MagicMock:
    """Create a mock Starlette request."""
    request = MagicMock()
    headers = _FakeHeaders()
    if auth_header:
        headers["authorization"] = auth_header
    request.headers = headers
    request.client = MagicMock()
    request.client.host = "127.0.0.1"
    request.scope = {"type": "http"}
    return request


def test_no_auth_returns_ip():
    request = _make_request("")
    result = _key_func(request)
    # Should fall back to IP-based key
    assert result is not None
    assert isinstance(result, str)


def test_non_bearer_returns_ip():
    request = _make_request("Basic dXNlcjpwYXNz")
    result = _key_func(request)
    assert not result.startswith("user:")


def test_invalid_jwt_returns_ip():
    request = _make_request("Bearer not.a.valid.jwt.token")
    result = _key_func(request)
    assert not result.startswith("user:")
