"""Phase 0 API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import HTTPException
import json
from uuid import uuid4
from backend.database import Base, IncidentRecord, SessionLocal, engine
from incident_processing.incident_detector import Alert, detect
from pydantic import BaseModel

router = APIRouter()
Base.metadata.create_all(engine)


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse, status_code=200, tags=["system"])
def health() -> HealthResponse:
    """Liveness check. This contract remains stable across all phases."""

    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc))

@router.post("/incidents", status_code=201)
def create_incident(alert: Alert) -> dict:
    incident, category = detect(alert, str(uuid4()))
    with SessionLocal() as session:
        session.add(IncidentRecord(id=incident.id, service=incident.service, error=incident.error, category=category, severity=incident.severity, payload=incident.model_dump_json()))
        session.commit()
    return {"incident": incident.model_dump(mode="json"), "category": category}

@router.get("/incidents/{incident_id}")
def get_incident(incident_id: str) -> dict:
    with SessionLocal() as session:
        record = session.get(IncidentRecord, incident_id)
    if not record: raise HTTPException(status_code=404, detail="Incident not found")
    return {"incident": json.loads(record.payload), "category": record.category}

