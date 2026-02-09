"""Disposition window mapping for signal types."""

# Maps signal types to disposition urgency windows
DISPOSITION_MAP: dict[str, str] = {
    "bankruptcy_ch7": "Immediate",
    "liquidation": "Immediate",
    "ceasing_operations": "Immediate",
    "office_closure": "2-4 weeks",
    "facility_shutdown": "2-4 weeks",
    "plant_closing": "1-3 months",
    "layoff": "1-3 months",
    "bankruptcy_ch11": "1-3 months",
    "restructuring": "1-3 months",
    "merger": "3-6 months",
    "acquisition": "3-6 months",
    "relocation": "3-6 months",
    # Aliases for non-canonical types in existing data
    "facility_closure": "2-4 weeks",
    "facility_closing": "2-4 weeks",
    "shutdown": "2-4 weeks",
}

# Priority ordering (lower index = more urgent)
URGENCY_ORDER = ["Immediate", "2-4 weeks", "1-3 months", "3-6 months"]


def get_disposition_window(signal_types: list[str]) -> str:
    """Return the most urgent disposition window for a set of signal types."""
    windows = set()
    for st in signal_types:
        window = DISPOSITION_MAP.get(st)
        if window:
            windows.add(window)

    if not windows:
        return "1-3 months"  # default

    # Return the most urgent
    for w in URGENCY_ORDER:
        if w in windows:
            return w

    return "1-3 months"
