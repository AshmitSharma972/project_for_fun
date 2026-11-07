from dataclasses import asdict, dataclass
from hindsight_memory.models import Incident
from hindsight_memory.fake_memory import FakeMemory

@dataclass
class ReplayStep:
    incident_id: str
    memory_enabled: bool
    matched_prior_cause: bool
    steps_to_verified_fix: int

async def replay(incidents: list[Incident], *, memory_enabled: bool) -> list[dict]:
    memory = FakeMemory()
    output = []
    for incident in incidents:
        recalled = await memory.recall_similar(f"{incident.service} {incident.error}") if memory_enabled else []
        output.append(asdict(ReplayStep(incident.id, memory_enabled, bool(recalled), 1 if recalled else 3)))
        await memory.retain_incident(incident)
    return output
