import asyncio
from hindsight_memory.fake_memory import FakeMemory
from hindsight_memory.models import Incident
from innovation.chaos_dojo import generate_synthetic
from innovation.deploy_risk import assess_deploy_risk
from innovation.staleness import staleness_notice

def test_synthetic_is_explicitly_tagged() -> None:
    assert "synthetic=true" in generate_synthetic().tags
def test_conflicting_verified_incidents_are_not_silent() -> None:
    old = Incident(id="old",service="api",error="timeout",symptoms=["timeout"],verified_cause="dns")
    new = Incident(id="new",service="api",error="timeout",symptoms=["timeout"],verified_cause="pool")
    assert "possibly outdated" in staleness_notice(new, old)
def test_risk_check_empty_memory_is_safe() -> None:
    assert asyncio.run(assess_deploy_risk(FakeMemory(), "deploy payment config")) == []
