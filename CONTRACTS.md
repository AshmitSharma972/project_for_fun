# Public contracts

This document is the compatibility ledger for IncidentMind AI. Public
interfaces introduced in a completed phase are never broken; later phases may
extend them only additively.

## Phase 0

### `GET /health`

- Returns HTTP `200`.
- JSON shape: `{"status": "ok", "timestamp": "<ISO-8601 UTC datetime>"}`.
- This endpoint performs no network access and does not require integration
  credentials, so it remains safe for liveness probes.

### Configuration

`config.settings.Settings` loads `HINDSIGHT_API_KEY`, `HINDSIGHT_BASE_URL`,
`GROQ_API_KEY`, and `MODEL_NAME` from the environment or `.env`. It raises a
clear Pydantic validation error when any required value is absent.

## Phase 1

`hindsight_memory.hindsight_client.Memory` defines async `retain_incident`,
`recall_similar`, and `reflect`. `HindsightMemory` is the production
implementation and uses only the official `hindsight-client` SDK; `FakeMemory`
implements the same contract for unit tests. `Incident` remains the stable,
validated payload accepted by retain.

## Phase 2

`POST /incidents` accepts service/error alert JSON and returns HTTP 201 with an
`incident` and `category`; `GET /incidents/{id}` returns that stored structure.

