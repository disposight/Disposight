from app.processing.device_filter import estimate_devices, passes_device_filter


def test_layoff_estimation():
    assert estimate_devices("layoff", 200) == 300
    assert estimate_devices("layoff", 100) == 150
    assert estimate_devices("layoff", 50) == 75


def test_bankruptcy_estimation():
    assert estimate_devices("bankruptcy_ch7", 100) == 300
    assert estimate_devices("bankruptcy_ch7", None) == 500  # Conservative estimate


def test_device_filter_passes():
    assert passes_device_filter("layoff", 200) is True
    assert passes_device_filter("bankruptcy_ch7", None) is True
    assert passes_device_filter("liquidation", None) is True
    assert passes_device_filter("office_closure", 100) is True


def test_device_filter_fails():
    assert passes_device_filter("layoff", 10) is False
    assert passes_device_filter("merger", 50) is False


def test_unknown_employee_count_passes():
    # Unknown employee count for non-bankruptcy should pass (let NLP decide)
    assert passes_device_filter("layoff", None) is True
    assert passes_device_filter("merger", None) is True


def test_entity_normalization():
    from app.processing.entity_extractor import normalize_company_name

    assert normalize_company_name("Acme Corporation, Inc.") == "acme corporation"
    assert normalize_company_name("GOOGLE LLC") == "google"
    assert normalize_company_name("  Apple Inc  ") == "apple"
    assert normalize_company_name("Microsoft Corp.") == "microsoft"


def test_rule_based_classification():
    from app.processing.signal_classifier import _rule_based_classification

    result = _rule_based_classification("Chapter 7 liquidation", "courtlistener")
    assert result["signal_type"] == "bankruptcy_ch7"
    assert result["severity_score"] == 85

    result = _rule_based_classification("WARN notice layoff", "warn_act")
    assert result["signal_type"] == "layoff"
    assert result["signal_category"] == "warn"

    result = _rule_based_classification("Merger and acquisition", "sec_edgar")
    assert result["signal_type"] == "merger"
