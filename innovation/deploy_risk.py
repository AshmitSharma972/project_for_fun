from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import MemoryEvidence

async def assess_deploy_risk(memory: Memory | None, change_description: str) -> list[MemoryEvidence]:
    return await memory.recall_similar(change_description) if memory and change_description.strip() else []
