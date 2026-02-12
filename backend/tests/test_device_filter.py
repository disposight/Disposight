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


def test_device_estimate_capped_at_10000():
    # A huge layoff should be capped at 10,000 devices
    assert estimate_devices("layoff", 20000) == 10_000
    assert estimate_devices("facility_shutdown", 10000) == 10_000  # 10000 * 2.0 = 20000 → capped


def test_device_estimate_not_capped_when_below():
    assert estimate_devices("layoff", 100) == 150  # 100 * 1.5 = 150, below cap
    assert estimate_devices("bankruptcy_ch7", 3000) == 9000  # 3000 * 3.0 = 9000, below cap


def test_state_code_validation():
    from app.processing.entity_extractor import validate_state_code

    assert validate_state_code("CA") == "CA"
    assert validate_state_code("ny") == "NY"  # case insensitive
    assert validate_state_code("WA") == "WA"
    assert validate_state_code("DC") == "DC"
    assert validate_state_code("PR") == "PR"
    assert validate_state_code(None) is None
    assert validate_state_code("T3") is None
    assert validate_state_code("XX") is None
    assert validate_state_code("") is None


def test_rejected_company_names():
    from app.processing.entity_extractor import _is_valid_company_name

    assert _is_valid_company_name("Retail") is False
    assert _is_valid_company_name("Company Name Unknown") is False
    assert _is_valid_company_name("Unknown") is False
    assert _is_valid_company_name("multiple") is False
    assert _is_valid_company_name("placeholder") is False
    assert _is_valid_company_name("TBA") is False


def test_short_name_allowlist():
    from app.processing.entity_extractor import _is_valid_company_name

    assert _is_valid_company_name("HP") is True
    assert _is_valid_company_name("3M") is True
    assert _is_valid_company_name("GE") is True
    assert _is_valid_company_name("GM") is True
    # Too short and not in allowlist
    assert _is_valid_company_name("AB") is False
    assert _is_valid_company_name("X") is False


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
