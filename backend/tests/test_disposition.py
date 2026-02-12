"""Tests for disposition window mapping."""

from app.processing.disposition import (
    get_disposition_window,
    DISPOSITION_MAP,
    URGENCY_ORDER,
)


def test_ch7_is_immediate():
    assert get_disposition_window(["bankruptcy_ch7"]) == "Immediate"


def test_liquidation_is_immediate():
    assert get_disposition_window(["liquidation"]) == "Immediate"


def test_ceasing_operations_is_immediate():
    assert get_disposition_window(["ceasing_operations"]) == "Immediate"


def test_office_closure_is_2_4_weeks():
    assert get_disposition_window(["office_closure"]) == "2-4 weeks"


def test_facility_shutdown_is_2_4_weeks():
    assert get_disposition_window(["facility_shutdown"]) == "2-4 weeks"


def test_layoff_is_1_3_months():
    assert get_disposition_window(["layoff"]) == "1-3 months"


def test_merger_is_3_6_months():
    assert get_disposition_window(["merger"]) == "3-6 months"


def test_most_urgent_wins():
    """When multiple signal types, the most urgent window should be returned."""
    assert get_disposition_window(["merger", "bankruptcy_ch7"]) == "Immediate"
    assert get_disposition_window(["layoff", "office_closure"]) == "2-4 weeks"
    assert get_disposition_window(["merger", "layoff"]) == "1-3 months"


def test_empty_signal_types_returns_default():
    assert get_disposition_window([]) == "1-3 months"


def test_unknown_signal_type_returns_default():
    assert get_disposition_window(["totally_unknown_type"]) == "1-3 months"


def test_aliases_map_correctly():
    assert get_disposition_window(["facility_closure"]) == "2-4 weeks"
    assert get_disposition_window(["facility_closing"]) == "2-4 weeks"
    assert get_disposition_window(["shutdown"]) == "2-4 weeks"


def test_all_map_entries_have_valid_urgency():
    for signal_type, window in DISPOSITION_MAP.items():
        assert window in URGENCY_ORDER, f"{signal_type} maps to invalid window '{window}'"
