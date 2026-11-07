"""Resilient thin adapter around the official ``hindsight-client`` SDK."""

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Protocol, TypeVar

from hindsight_client import Hindsight

from config.settings import Settings
from hindsight_memory.models import Incident, MemoryEvidence, ReflectionResult, RetainResult

logger = logging.getLogger(__name__)
T = TypeVar("T")


class Memory(Protocol):
    async def retain_incident(self, incident: Incident) -> RetainResult: ...
    async def recall_similar(self, query: str, k: int = 5) -> list[MemoryEvidence]: ...
    async def reflect(self, question: str) -> ReflectionResult: ...


class HindsightMemory:
    """Incident memory backed solely by Hindsight's official Python SDK.

    The SDK owns extraction, retrieval and reflection. This class only serializes
    IncidentMind data and translates SDK responses into stable application types.
    """

    bank_id = "incidentmind"

    def __init__(self, client: Hindsight, *, retries: int = 2, backoff_seconds: float = 0.05) -> None:
        self.client = client
        self.retries = retries
        self.backoff_seconds = backoff_seconds
        self._bank_ready = False

    @classmethod
    def from_settings(cls, settings: Settings) -> "HindsightMemory":
        return cls(Hindsight(
            base_url=str(settings.hindsight_base_url),
            api_key=settings.hindsight_api_key.get_secret_value(),
            timeout=30.0,
            max_attempts=1,
        ))

    async def _call(self, operation: Callable[[], Awaitable[T]]) -> T:
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                return await operation()
            except Exception as exc:  # SDK exceptions vary by transport/provider.
                last_error = exc
                if attempt < self.retries:
                    await asyncio.sleep(self.backoff_seconds * (2**attempt))
        assert last_error is not None
        raise last_error

    async def _ensure_bank(self) -> None:
        if self._bank_ready:
            return
        await self._call(lambda: self.client.acreate_bank(
            bank_id=self.bank_id,
            name="IncidentMind",
            retain_mission="Preserve incident symptoms, causes, outcomes, and engineer-verified resolutions.",
            reflect_mission="Provide evidence-grounded incident-response insights; distinguish verified evidence from hypotheses.",
        ))
        self._bank_ready = True

    @staticmethod
    def _content(incident: Incident) -> str:
        return json.dumps(incident.model_dump(mode="json"), sort_keys=True)

    async def retain_incident(self, incident: Incident) -> RetainResult:
        try:
            await self._ensure_bank()
            await self._call(lambda: self.client.aretain(
                bank_id=self.bank_id,
                content=self._content(incident),
                document_id=incident.id,
                tags=incident.tags,
                metadata={"incident_id": incident.id, "service": incident.service, "outcome": incident.outcome},
            ))
            return RetainResult(accepted=True)
        except Exception as exc:
            logger.warning("hindsight_retain_unavailable", extra={"error": str(exc)})
            return RetainResult(accepted=False, error="Hindsight memory is temporarily unavailable.")

    async def recall_similar(self, query: str, k: int = 5) -> list[MemoryEvidence]:
        if not query.strip() or k < 1:
            return []
        try:
            await self._ensure_bank()
            response = await self._call(lambda: self.client.arecall(
                bank_id=self.bank_id, query=query, max_tokens=max(256, k * 512), include_chunks=True,
            ))
            results = list(getattr(response, "results", []) or [])[:k]
            chunks = getattr(response, "chunks", None) or {}
            return [MemoryEvidence(
                memory_id=str(getattr(item, "id", "")) or None,
                text=str(getattr(item, "text", "")),
                raw_memory_text=str(getattr(chunks.get(getattr(item, "chunk_id", None), None), "text", getattr(item, "text", ""))),
                memory_type=str(getattr(item, "type", "")) or None,
            ) for item in results]
        except Exception as exc:
            logger.warning("hindsight_recall_unavailable", extra={"error": str(exc)})
            return []

    async def reflect(self, question: str) -> ReflectionResult:
        if not question.strip():
            return ReflectionResult(text="", available=True)
        try:
            await self._ensure_bank()
            response = await self._call(lambda: self.client.areflect(bank_id=self.bank_id, query=question))
            facts = getattr(response, "facts", None) or []
            return ReflectionResult(text=str(getattr(response, "text", "")), evidence_ids=[str(getattr(f, "id", "")) for f in facts if getattr(f, "id", None)])
        except Exception as exc:
            logger.warning("hindsight_reflect_unavailable", extra={"error": str(exc)})
            return ReflectionResult(text="Hindsight reflection is temporarily unavailable.", available=False, error="Hindsight memory is temporarily unavailable.")
