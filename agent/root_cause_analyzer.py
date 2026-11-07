import json
from typing import Protocol
from pydantic import BaseModel, Field
from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import Incident, MemoryEvidence
from agent.runbook_recommender import recommend_runbook

class Hypothesis(BaseModel):
    cause: str
    evidence_incident_ids: list[str] = Field(default_factory=list)
    reasoning: str
    status: str = "suspected"
class Analysis(BaseModel):
    hypotheses: list[Hypothesis]
    recommended_steps: list[str]
    runbook_ref: str
    evidence: list[MemoryEvidence] = Field(default_factory=list)
    historical_experience: str = "no relevant experience"
    fallback_used: bool = False
class LLM(Protocol):
    async def complete(self, prompt: str) -> str: ...

class RootCauseAnalyzer:
    def __init__(self, memory: Memory | None, llm: LLM | None = None) -> None: self.memory, self.llm = memory, llm
    async def analyze(self, incident: Incident, category: str) -> Analysis:
        evidence = await self.memory.recall_similar(f"{incident.service} {incident.error}") if self.memory else []
        runbook, fallback_steps = recommend_runbook(incident, category)
        if not evidence:
            return Analysis(hypotheses=[], recommended_steps=fallback_steps, runbook_ref=runbook, evidence=[], fallback_used=self.llm is None)
        if not self.llm:
            return Analysis(hypotheses=[], recommended_steps=fallback_steps, runbook_ref=runbook, evidence=evidence, historical_experience="relevant experience retrieved", fallback_used=True)
        prompt = json.dumps({"incident": incident.model_dump(mode="json"), "evidence": [{"id": e.memory_id, "text": e.text} for e in evidence], "schema": "hypotheses/recommended_steps/runbook_ref"})
        try:
            parsed = Analysis.model_validate_json(await self.llm.complete(prompt))
            valid = {e.memory_id for e in evidence}
            for hypothesis in parsed.hypotheses:
                hypothesis.evidence_incident_ids = [i for i in hypothesis.evidence_incident_ids if i in valid]
                hypothesis.status = "suspected"
            parsed.evidence, parsed.historical_experience = evidence, "relevant experience retrieved"
            return parsed
        except Exception:
            return Analysis(hypotheses=[], recommended_steps=fallback_steps, runbook_ref=runbook, evidence=evidence, historical_experience="relevant experience retrieved", fallback_used=True)
