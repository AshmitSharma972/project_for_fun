import asyncio
from hindsight_memory.models import Incident, MemoryEvidence
from innovation.anti_runbooks import failed_fix_warnings
from innovation.replay_lab import replay
from innovation.reflect_insights import reflect_insight

def fixtures(): return [Incident(id="one",service="api",error="timeout",verified_cause="pool"), Incident(id="two",service="api",error="timeout")]
def test_replay_is_deterministic_and_chart_ready() -> None:
    assert asyncio.run(replay(fixtures(), memory_enabled=True)) == asyncio.run(replay(fixtures(), memory_enabled=True))
def test_anti_runbook_only_for_failed_outcomes() -> None:
    failed = MemoryEvidence(memory_id="x", text="", raw_memory_text='{"outcome": "failed"}')
    resolved = MemoryEvidence(memory_id="y", text="", raw_memory_text='{"outcome": "resolved"}')
    assert failed_fix_warnings([failed]) and not failed_fix_warnings([resolved])
def test_reflect_fallback() -> None:
    assert "unavailable" in asyncio.run(reflect_insight(None, "causes"))["text"]
