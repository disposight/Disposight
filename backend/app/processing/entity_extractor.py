import re

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company
from app.processing.llm_client import llm_client
from app.processing.prompts import ENTITY_EXTRACTION_PROMPT

logger = structlog.get_logger()


async def extract_entities(text: str, source_type: str) -> dict:
    """Extract structured entities from raw signal text using LLM."""
    prompt = ENTITY_EXTRACTION_PROMPT.format(text=text[:2000], source_type=source_type)
    try:
        return await llm_client.complete_json(prompt, model="haiku")
    except Exception as e:
        logger.warning("entity_extraction.failed", error=str(e))
        return {}


def normalize_company_name(name: str) -> str:
    """Normalize a company name for fuzzy matching."""
    name = name.strip().lower()
    # Remove common suffixes
    for suffix in [", inc.", ", inc", " inc.", " inc", ", llc", " llc", ", ltd", " ltd",
                   ", corp.", " corp.", ", corp", " corp", " co.", " co", " company",
                   " group", " holdings", " international"]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]
    # Remove punctuation
    name = re.sub(r"[^\w\s]", "", name)
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _clean_llm_value(val: str | None) -> str | None:
    """Strip LLM artifacts like literal 'null', 'None', 'N/A' to actual None."""
    if val is None:
        return None
    val = val.strip()
    if val.lower() in ("null", "none", "n/a", "unknown", ""):
        return None
    return val


# Names that are meaningless — never create a Company for these
_REJECTED_NAMES = frozenset({
    "unknown", "n a", "na", "null", "none", "tbd", "unnamed", "test",
    "company", "the company", "the", "undisclosed", "not available",
    "not specified", "various", "confidential", "redacted",
    "retail", "company name unknown", "multiple", "several companies",
    "unidentified", "tba", "no company", "placeholder",
})

# Legitimate 2-character company names that bypass the min-length check
_ALLOWED_SHORT_NAMES = frozenset({"hp", "3m", "ge", "gm", "bp", "at"})

# Valid US state/territory codes
VALID_US_STATES = frozenset({
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "AS", "MP",
})


def validate_state_code(state: str | None) -> str | None:
    """Return the state code if valid, None otherwise."""
    if state is None:
        return None
    state = state.strip().upper()
    if state in VALID_US_STATES:
        return state
    logger.warning("entity_extractor.invalid_state_code", state=state)
    return None


def _is_valid_company_name(name: str) -> bool:
    """Return True if name is a meaningful, real company name."""
    normalized = normalize_company_name(name)
    if not normalized:
        return False
    if len(normalized) < 3 and normalized not in _ALLOWED_SHORT_NAMES:
        return False
    if normalized in _REJECTED_NAMES:
        return False
    return True


async def find_or_create_company(db: AsyncSession, name: str, **kwargs) -> Company:
    """Find an existing company by normalized name or create a new one.

    Raises ValueError if the name is meaningless (e.g. 'Unknown', 'null').
    """
    if not _is_valid_company_name(name):
        raise ValueError(f"Rejected company name: {name!r}")

    normalized = normalize_company_name(name)

    result = await db.execute(
        select(Company).where(Company.normalized_name == normalized)
    )
    company = result.scalar_one_or_none()

    if company:
        return company

    company = Company(
        name=name.strip(),
        normalized_name=normalized,
        headquarters_city=_clean_llm_value(kwargs.get("city")),
        headquarters_state=validate_state_code(_clean_llm_value(kwargs.get("state"))),
    )
    db.add(company)
    await db.flush()

    logger.info("company.created", name=name, normalized=normalized)
    return company
