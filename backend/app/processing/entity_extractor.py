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


async def find_or_create_company(db: AsyncSession, name: str, **kwargs) -> Company:
    """Find an existing company by normalized name or create a new one."""
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
        headquarters_city=kwargs.get("city"),
        headquarters_state=kwargs.get("state"),
    )
    db.add(company)
    await db.flush()

    logger.info("company.created", name=name, normalized=normalized)
    return company
