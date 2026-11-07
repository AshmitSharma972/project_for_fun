import asyncio
from agent.root_cause_analyzer import RootCauseAnalyzer
from hindsight_memory.fake_memory import FakeMemory
from hindsight_memory.models import Incident

def incident(): return Incident(id="current", service="payments", error="timeout")
class Llm:
    def __init__(self, result): self.result = result
    async def complete(self, prompt): return self.result

def test_cold_start_is_honest() -> None:
    result = asyncio.run(RootCauseAnalyzer(FakeMemory()).analyze(incident(), "API"))
    assert result.historical_experience == "no relevant experience"
    assert result.hypotheses == []

def test_hallucinated_evidence_is_stripped() -> None:
    async def run():
        memory = FakeMemory(); await memory.retain_incident(Incident(id="historic",service="payments",error="timeout"))
        output = '{"hypotheses":[{"cause":"pool","evidence_incident_ids":["historic","invented"],"reasoning":"match"}],"recommended_steps":["check"],"runbook_ref":"api_failure.md"}'
        return await RootCauseAnalyzer(memory, Llm(output)).analyze(incident(), "API")
    assert asyncio.run(run()).hypotheses[0].evidence_incident_ids == ["historic"]

def test_malformed_llm_uses_runbook_fallback() -> None:
    async def run():
        memory = FakeMemory(); await memory.retain_incident(Incident(id="historic",service="payments",error="timeout"))
        return await RootCauseAnalyzer(memory, Llm("not json")).analyze(incident(), "API")
    assert asyncio.run(run()).fallback_used
