from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import Incident, RetainResult

async def retain_incident(memory: Memory, incident: Incident) -> RetainResult:
    return await memory.retain_incident(incident)
