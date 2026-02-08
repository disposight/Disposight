import json

import structlog
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()


class LLMClient:
    """Adapter for Claude and OpenAI APIs with automatic fallback."""

    def __init__(self):
        self._anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None
        self._openai = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, max=8))
    async def complete(
        self,
        prompt: str,
        model: str = "haiku",
        max_tokens: int = 1024,
    ) -> str:
        """Get a completion from Claude (primary) or OpenAI (fallback)."""
        if self._anthropic:
            try:
                model_id = {
                    "haiku": "claude-haiku-4-5-20251001",
                    "sonnet": "claude-sonnet-4-5-20250929",
                }.get(model, model)

                response = await self._anthropic.messages.create(
                    model=model_id,
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.content[0].text
            except Exception as e:
                logger.warning("llm.claude_failed", error=str(e), model=model)
                if self._openai:
                    return await self._openai_fallback(prompt, max_tokens)
                raise

        if self._openai:
            return await self._openai_fallback(prompt, max_tokens)

        raise RuntimeError("No LLM API configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.")

    async def _openai_fallback(self, prompt: str, max_tokens: int) -> str:
        response = await self._openai.chat.completions.create(
            model="gpt-4o-mini",
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
