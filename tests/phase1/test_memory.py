import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from hindsight_memory.fake_memory import FakeMemory
from hindsight_memory.hindsight_client import HindsightMemory
from hindsight_memory.models import Incident


def incident() -> Incident:
    return Incident(id="inc-1", service="payments", error="connection pool timeout", severity="high", symptoms=["timeouts"], tags=["database"])


def test_fake_retain_then_recall() -> None:
    async def exercise() -> None:
        memory = FakeMemory()
        assert (await memory.retain_incident(incident())).accepted
        recalled = await memory.recall_similar("payments database connection timeout")
        assert recalled[0].memory_id == "inc-1"
        assert "connection pool timeout" in recalled[0].raw_memory_text
    asyncio.run(exercise())


def test_empty_memory_is_empty() -> None:
    assert asyncio.run(FakeMemory().recall_similar("anything")) == []


def test_malformed_incident_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Incident(id="", service="payments", error="")


def test_real_wrapper_uses_official_async_methods_and_retries() -> None:
    class Client:
        def __init__(self) -> None: self.calls = 0
        async def acreate_bank(self, **kwargs): return SimpleNamespace()
        async def aretain(self, **kwargs):
            self.calls += 1
            if self.calls == 1: raise TimeoutError("simulated timeout")
            return SimpleNamespace()
        async def arecall(self, **kwargs): return SimpleNamespace(results=[])
        async def areflect(self, **kwargs): return SimpleNamespace(text="ok", facts=[])
    async def exercise() -> None:
        client = Client()
        memory = HindsightMemory(client, retries=1, backoff_seconds=0)
        assert (await memory.retain_incident(incident())).accepted
        assert client.calls == 2
        assert await memory.recall_similar("none") == []
        assert (await memory.reflect("status")).text == "ok"
    asyncio.run(exercise())


def test_wrapper_failure_falls_back_without_crashing() -> None:
    class Client:
        async def acreate_bank(self, **kwargs): raise TimeoutError("offline")
    async def exercise() -> None:
        memory = HindsightMemory(Client(), retries=0)
        assert not (await memory.retain_incident(incident())).accepted
        assert await memory.recall_similar("payments") == []
        assert not (await memory.reflect("payments")).available
    asyncio.run(exercise())
