"""Phase 1 fake-memory demo; real Hindsight requires configured credentials."""
import asyncio
import sys
from hindsight_memory.fake_memory import FakeMemory
from hindsight_memory.models import Incident

async def main() -> None:
    memory = FakeMemory()
    incident = Incident(id="demo-1", service="payments", error="connection pool timeout", severity="high", symptoms=["timeouts"])
    await memory.retain_incident(incident)
    print((await memory.recall_similar("payments connection timeout"))[0].raw_memory_text)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
