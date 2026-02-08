import structlog

from app.processing.llm_client import llm_client
from app.processing.prompts import SIGNAL_CLASSIFICATION_PROMPT

logger = structlog.get_logger()

# Source reliability weights
SOURCE_WEIGHTS = {
    "warn_act": 95,
    "sec_edgar": 90,
    "courtlistener": 90,
    "gdelt": 60,
}


async def classify_signal(text: str, company_name: str, source_type: str) -> dict:
    """Classify a signal and score confidence + severity."""
    prompt = SIGNAL_CLASSIFICATION_PROMPT.format(
        text=text[:2000],
        company_name=company_name,
        source_type=source_type,
    )
    try:
        result = await llm_client.complete_json(prompt, model="haiku")
        # Apply source reliability weight
        source_weight = SOURCE_WEIGHTS.get(source_type, 50)
        result["confidence_score"] = min(100, int(
            result.get("confidence_score", 50) * source_weight / 100
        ))
        return result
    except Exception as e:
        logger.warning("classification.failed", error=str(e))
        # Fallback: rule-based classification
        return _rule_based_classification(text, source_type)


def _rule_based_classification(text: str, source_type: str) -> dict:
    """Fallback rule-based classification when LLM is unavailable."""
    text_lower = text.lower()

    category_map = {
        "warn_act": "warn",
        "gdelt": "news",
        "sec_edgar": "filing",
        "courtlistener": "bankruptcy",
    }

    if "chapter 7" in text_lower or "liquidation" in text_lower:
        signal_type = "bankruptcy_ch7"
        severity = 85
    elif "chapter 11" in text_lower or "bankruptcy" in text_lower:
        signal_type = "bankruptcy_ch11"
        severity = 75
    elif "layoff" in text_lower or "warn" in text_lower:
        signal_type = "layoff"
        severity = 65
    elif "closure" in text_lower or "closing" in text_lower or "shutdown" in text_lower:
        signal_type = "office_closure"
        severity = 70
    elif "merger" in text_lower or "acquisition" in text_lower:
        signal_type = "merger"
        severity = 50
    else:
        signal_type = "unknown"
        severity = 30

    return {
        "signal_type": signal_type,
        "signal_category": category_map.get(source_type, "news"),
        "confidence_score": SOURCE_WEIGHTS.get(source_type, 50),
        "severity_score": severity,
    }
