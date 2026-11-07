from hindsight_memory.hindsight_client import Memory

async def reflect_insight(memory: Memory | None, question: str) -> dict:
    if memory is None: return {"text": "Hindsight reflection is unavailable.", "cached": False}
    result = await memory.reflect(question)
    return {"text": result.text, "cached": False, "available": result.available}
