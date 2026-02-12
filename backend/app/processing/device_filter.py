"""Critical filter: estimate surplus devices from a signal.

Every signal must answer: "Could this event produce 100+ surplus devices?"
"""

import structlog

logger = structlog.get_logger()

# Device estimation multipliers by event type
DEVICE_MULTIPLIERS = {
    "layoff": 1.5,              # 1 laptop + peripherals per employee
    "office_closure": 1.8,      # More equipment per person (monitors, docking stations)
    "facility_shutdown": 2.0,   # Includes servers, networking gear
    "plant_closing": 1.5,
    "bankruptcy_ch7": 3.0,      # Forced liquidation = everything goes
    "bankruptcy_ch11": 1.5,     # Restructuring, partial surplus
    "merger": 1.0,              # Duplicate infrastructure
    "acquisition": 1.0,
    "liquidation": 3.0,
    "ceasing_operations": 3.0,
    "restructuring": 1.2,       # Partial surplus from reorg
    "relocation": 0.5,          # May keep equipment
    # Aliases for non-canonical types in existing data
    "facility_closure": 1.8,
    "facility_closing": 2.0,
    "shutdown": 2.0,
}

DEVICE_THRESHOLD = 100


def estimate_devices(event_type: str, employees_affected: int | None) -> int | None:
    """Estimate the number of surplus devices from an event."""
    if employees_affected is None:
        # Bankruptcy and liquidation are always high-value even without employee count
        if event_type in ("bankruptcy_ch7", "bankruptcy_ch11", "liquidation", "ceasing_operations"):
            return 500  # Conservative estimate for unknown-size companies
        return None

    multiplier = DEVICE_MULTIPLIERS.get(event_type, 1.0)
    estimate = int(employees_affected * multiplier)
    if estimate > 10_000:
        logger.warning(
            "device_filter.estimate_capped",
            event_type=event_type,
            employees=employees_affected,
            raw_estimate=estimate,
            capped_at=10_000,
        )
        return 10_000
    return estimate


def passes_device_filter(event_type: str, employees_affected: int | None) -> bool:
    """Check if a signal passes the critical device threshold filter."""
    estimate = estimate_devices(event_type, employees_affected)

    if estimate is None:
        # Unknown — let through for NLP to assess
        return True

    passes = estimate >= DEVICE_THRESHOLD

    if not passes:
        logger.info(
            "device_filter.below_threshold",
            event_type=event_type,
            employees=employees_affected,
            estimate=estimate,
            threshold=DEVICE_THRESHOLD,
        )

    return passes
