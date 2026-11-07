# IncidentMind AI

IncidentMind AI is an incident-response assistant that recommends (but never
executes) recovery actions. Its persistent learning layer will use official
[Hindsight](https://github.com/vectorize-io/hindsight) memory banks to retain
incident outcomes, recall relevant evidence, and reflect on recurring patterns.

## Current status

**Phase 1 complete:** the Phase 0 FastAPI foundation is joined by a typed,
resilient Hindsight memory adapter, test-only `FakeMemory`, sample seed data,
and a Retain → Recall CLI demo. Incident ingestion and dashboard features are
deliberately deferred until their respective gated phases.

## 10-line implementation plan

1. Establish a tested FastAPI/configuration baseline and record public contracts.
2. Add a thin, typed official Hindsight client wrapper and a test-only fake.
3. Parse alerts/logs into normalized, persisted incident records.
4. Recall Hindsight evidence and produce validated, grounded RCA recommendations.
5. Capture engineer verification and retain real outcomes for future learning.
6. Add Replay Lab to compare recommendations with and without memory.
7. Surface failed fixes through anti-runbook warnings and use Hindsight Reflect insights.
8. Build a Streamlit UI that calls only the FastAPI backend.
9. Add opt-in synthetic chaos, staleness/conflict, and deploy-risk features.
10. Harden, document, containerize, test from a fresh clone, and tag `v1.0`.

## Hindsight verification and intended integration

Before implementation, the official documentation and a shallow clone of the
official repository were inspected. The verified Python package is
`hindsight-client`; its client class is `hindsight_client.Hindsight`. The
repository’s implementation is in
`hindsight-clients/python/hindsight_client/hindsight_client.py`, with behavioral
tests in `hindsight-clients/python/tests/`, notably `test_main_operations.py`,
`test_async_sync_parity.py`, and the Retain/Recall/Reflect option tests.

Phase 1 will install that official package and use its supported async methods
inside FastAPI: `Hindsight(base_url=..., api_key=..., timeout=...)`,
`await client.acreate_bank(...)`, `await client.aretain(...)`,
`await client.arecall(...)`, and `await client.areflect(...)`. The wrapper will
adapt official response models to IncidentMind typed evidence results; it will
not implement vector search, fact extraction, graph retrieval, or reflection
itself. Hindsight remains the only memory layer.

The exact API choices will be rechecked against the pinned installed client and
the cloned official repository before Phase 1 code is written. The official
client documents synchronous helpers for scripts, but its source explicitly
prefers `a*` methods in async frameworks such as FastAPI.

### Phase 1 memory commands

With configured credentials, seed the real `incidentmind` Hindsight bank:

```powershell
python -m hindsight_memory.seed
```

The credential-free unit-test demo uses `FakeMemory` only:

```powershell
python -m hindsight_memory.demo
```

## Hindsight assumptions to verify in Phase 1

- The installed `hindsight-client` version matches the inspected client API.
- Cloud authentication accepts `api_key` as the documented bearer token.
- The configured Hindsight endpoint supports bank creation and the `incidentmind` bank ID.
- `create_bank` is idempotent enough for create-or-retrieve behavior, or the
  official bank-list/get API must be used first.
- Retain response, Recall `results`, and Reflect response/citation fields match
  the installed SDK models used by our typed adapter.
- Service-side timeout/retry semantics do not conflict with the wrapper’s
  bounded retries and fallback behavior.

## Setup and Phase 0 demo

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Fill in the required values before using Hindsight or Groq features.
uvicorn main:app --reload
```

Visit `http://127.0.0.1:8000/health`. Phase 0’s endpoint works even before
credentials are populated. Run tests with:

```powershell
pytest
```

## BAND Desktop (hackathon collaboration requirement)

Band Desktop (formerly Jam) is installed separately from this Python app. The
official Windows x64 installer is linked in Band’s
[installation guide](https://docs.band.ai/band-desktop/install). Run it, sign
in to a Band account, enable the locally installed Codex runtime in the setup
wizard, then verify with `band daemon status` and `band doctor`. It is used for
agent collaboration and auditable development workflow; it is **not** part of
IncidentMind’s runtime, memory system, or production data path.

## Safety and limitations

- Recommendations require explicit engineer approval before any simulated or
  logged action in later phases; IncidentMind never executes recovery actions.
- Secrets belong only in environment variables. `.env` is ignored by Git.
- No Hindsight or Groq credentials are available in this workspace, so Phase 0
  cannot verify a live integration. That verification is a Phase 1 integration
  gate when credentials are supplied.

## Architecture

`Alerts/logs → FastAPI + SQLite → Incident agent → official Hindsight Retain / Recall / Reflect → Groq (when configured) → Streamlit evidence UI → engineer feedback → Hindsight learning`.

Hindsight is the sole memory system. `retain_incident` writes verified incident
records through `Hindsight.aretain`; `recall_similar` turns `Hindsight.arecall`
results into evidence for the agent; `reflect` delegates questions to
`Hindsight.areflect`. See `hindsight_memory/hindsight_client.py`.

## Docker and demo

Copy `.env.example` to `.env`, populate credentials, then run `docker compose up --build`.
The API listens on port 8000, the Streamlit fallback on port 8501, and the Next.js
frontend on port 3000. See
[DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the record-ready eight-step presentation.

## Next.js web frontend

`frontend_web/` is the new marketing site and interactive response console. The
original Streamlit dashboard remains available as a fallback. The Next.js app
proxies browser requests from `/api/*` to FastAPI using a rewrite, so the browser
does not call the API origin directly and does not need CORS configuration.

### Run locally

Start FastAPI in the repository root:

```powershell
uvicorn main:app --reload
```

In a second terminal, install and start the web app:

```powershell
cd frontend_web
Copy-Item .env.example .env.local
pnpm install
pnpm run dev
```

Open `http://localhost:3000` for the cinematic landing page and
`http://localhost:3000/console` for the incident console. Set
`NEXT_PUBLIC_USE_MOCK=true` in `frontend_web/.env.local` to use contract-shaped
demo fixtures without a live backend. A **Demo data** badge is shown whenever
mock fixtures are active. For live requests, keep it `false` and set
`INCIDENTMIND_API_BASE_URL=http://127.0.0.1:8000`.

### Test the web app

```powershell
cd frontend_web
pnpm run typecheck
pnpm test
pnpm run test:e2e
```

Playwright runs the complete intake → analysis → feedback → simulated approval
flow in mock mode. Backend tests remain in the repository root and run with
`pytest`.

### Docker Compose

On Windows, double-click `start-project.cmd` (or run `./start-project.ps1` in
PowerShell) to start Docker Desktop if needed, build the images, and run all
three services in the background. Use `stop-project.cmd` or
`./stop-project.ps1` to stop them; their containers and SQLite data volume stay
in place for the next start. The Compose services use `restart: unless-stopped`,
so they resume when Docker Desktop starts again. For automatic resume after sign
in, enable **Start Docker Desktop when you sign in** in Docker Desktop settings.

You can also use `docker compose up -d --build` and `docker compose stop`
directly. FastAPI is at `:8000`, the Streamlit fallback at `:8501`, and Next.js
at `:3000`. The frontend image builds with
`INCIDENTMIND_API_BASE_URL=http://api:8000`, pointing its Next.js rewrite at the
Compose API service. API integrations are optional; copy `.env.example` to `.env`
only when you need to configure Hindsight or Groq credentials. Set
`NEXT_PUBLIC_USE_MOCK=true` before building only when you want the frontend to
use demo fixtures.

### Contract notes

`CONTRACTS.md` documents the health and incident creation/retrieval contracts,
while `backend/api.py` also exposes analysis, feedback, simulated approval and
outcome-statistics routes. The web app validates each route response with Zod
schemas in `frontend_web/lib/contracts.ts`, logs response mismatches, and renders
optional fields defensively. The live API does not provide an incident-list
route, integration-status fields, similarity scores, or enriched service,
category, outcome and verified-cause fields on memory evidence. The console
therefore keeps recent IDs in browser storage, shows integration status as
“not reported by API,” and only renders evidence details when the backend
actually supplies them. The landing preview uses clearly labelled demo fixtures.

Animation timing, easing, stagger and Lenis lerp values live in
`frontend_web/lib/animation.ts`.

# project_for_fun
