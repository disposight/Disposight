import json

import structlog
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()

# Map internal model aliases to OpenAI model IDs
MODEL_MAP = {
    "haiku": "gpt-4o-mini",
    "sonnet": "gpt-4o",
}


class LLMClient:
    """OpenAI-powered LLM client for NLP processing."""

    def __init__(self):
        self._client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, max=8))
    async def complete(
        self,
        prompt: str,
        model: str = "haiku",
        max_tokens: int = 1024,
    ) -> str:
        """Get a completion from OpenAI."""
        if not self._client:
            raise RuntimeError("No LLM API configured. Set OPENAI_API_KEY.")

        model_id = MODEL_MAP.get(model, model)
        response = await self._client.chat.completions.create(
            model=model_id,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    async def complete_json(
        self,
        prompt: str,
        model: str = "haiku",
        max_tokens: int = 1024,
    ) -> dict:
        """Get a JSON completion, parsing the response."""
        text = await self.complete(prompt, model=model, max_tokens=max_tokens)
        # Extract JSON from response (handle markdown code blocks)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)


llm_client = LLMClient()
