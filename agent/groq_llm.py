"""Groq adapter; only constructed when a configured API key is available."""
from groq import AsyncGroq
from config.settings import Settings

class GroqLlm:
    def __init__(self, settings: Settings) -> None:
        self.client = AsyncGroq(api_key=settings.groq_api_key.get_secret_value(), timeout=30.0, max_retries=0)
        self.model = settings.model_name
    async def complete(self, prompt: str) -> str:
        response = await self.client.chat.completions.create(model=self.model, messages=[{"role":"system","content":"Return valid JSON only."},{"role":"user","content":prompt}], response_format={"type":"json_object"})
        return response.choices[0].message.content or "{}"
