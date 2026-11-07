from hindsight_memory.models import MemoryEvidence

def failed_fix_warnings(memories: list[MemoryEvidence]) -> list[str]:
    warnings = []
    for memory in memories:
        text = memory.raw_memory_text.lower()
        if '"outcome": "failed"' in text or '"outcome":"failed"' in text:
            warnings.append(f"Tried before and failed in 1 recorded case ({memory.memory_id}). Review its context before repeating the fix.")
    return warnings
