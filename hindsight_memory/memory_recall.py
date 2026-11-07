from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import MemoryEvidence

async def recall_similar(memory: Memory, query: str, k: int = 5) -> list[MemoryEvidence]:
    return await memory.recall_similar(query, k)
