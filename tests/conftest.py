"""Windows CI uses Selector loops to avoid unavailable Proactor self-pipes."""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
