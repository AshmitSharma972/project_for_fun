"""Test-only in-memory implementation of the Phase 1 memory contract."""

import json
import re

from hindsight_memory.models import Incident, MemoryEvidence, ReflectionResult, RetainResult


class FakeMemory:
    def __init__(self) -> None:
        self.incidents: dict[str, Incident] = {}

    async def retain_incident(self, incident: Incident) -> RetainResult:
        self.incidents[incident.id] = incident
        return RetainResult(accepted=True)

    async def recall_similar(self, query: str, k: int = 5) -> list[MemoryEvidence]:
        terms = set(re.findall(r"[a-z0-9_-]+", query.lower()))
        tokens = lambda incident: set(re.findall(r"[a-z0-9_-]+", json.dumps(incident.model_dump(mode="json")).lower()))
        ranked = sorted(self.incidents.values(), key=lambda incident: len(terms & tokens(incident)), reverse=True)
        return [MemoryEvidence(memory_id=i.id, text=json.dumps(i.model_dump(mode="json")), raw_memory_text=json.dumps(i.model_dump(mode="json")), memory_type="fake") for i in ranked[:k] if terms & tokens(i)]

    async def reflect(self, question: str) -> ReflectionResult:
        evidence = await self.recall_similar(question)
        return ReflectionResult(text="No relevant experience." if not evidence else evidence[0].text, evidence_ids=[e.memory_id for e in evidence if e.memory_id])
