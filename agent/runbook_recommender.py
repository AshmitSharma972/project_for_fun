from pathlib import Path
from hindsight_memory.models import Incident

_RUNBOOKS = {"database": "database_failure.md", "api": "api_failure.md", "overload": "server_overload.md"}

def recommend_runbook(incident: Incident, category: str) -> tuple[str, list[str]]:
    filename = _RUNBOOKS.get(category.lower(), "api_failure.md")
    path = Path(__file__).parents[1] / "runbooks" / filename
    steps = [line.removeprefix("- ") for line in path.read_text().splitlines() if line.startswith("- ")]
    return filename, steps
