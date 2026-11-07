from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import ReflectionResult

async def reflect(memory: Memory, question: str) -> ReflectionResult:
    return await memory.reflect(question)
