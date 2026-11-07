import asyncio, json
from pathlib import Path
from hindsight_memory.hindsight_client import HindsightMemory
from hindsight_memory.models import Incident
from config.settings import get_settings

async def main() -> None:
    memory = HindsightMemory.from_settings(get_settings())
    for item in json.loads((Path(__file__).parents[1] / 'data' / 'sample_incidents.json').read_text()):
        print(await memory.retain_incident(Incident.model_validate(item)))
if __name__ == '__main__': asyncio.run(main())
