import asyncio
from backend.api import create_incident
from incident_processing.incident_detector import Alert
from learning.feedback_processor import Feedback, process_feedback
from learning.outcome_stats import outcome_stats
from hindsight_memory.fake_memory import FakeMemory

def test_feedback_is_idempotent_and_stats_are_honest() -> None:
    async def run():
        created = create_incident(Alert(service="billing", error="database timeout"))["incident"]
        memory = FakeMemory(); feedback = Feedback(verified_cause="pool exhausted", steps_taken=["scale pool"], outcome="resolved")
        assert (await process_feedback(created["id"], feedback, memory))["memory_retained"]
        assert not (await process_feedback(created["id"], feedback, memory))["memory_retained"]
        return outcome_stats()
    result = asyncio.run(run())
    assert "of" in result["resolved_display"] and "recorded" in result["resolved_display"]
