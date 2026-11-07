"""Phase 0 API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import HTTPException
import json
from uuid import uuid4
from backend.database import Base, IncidentRecord, SessionLocal, engine
from incident_processing.incident_detector import Alert, detect
from hindsight_memory.models import Incident
from agent.root_cause_analyzer import RootCauseAnalyzer
from agent.groq_llm import GroqLlm
from config.settings import Settings
from hindsight_memory.hindsight_client import HindsightMemory
from learning.feedback_processor import Feedback, process_feedback
from learning.outcome_stats import outcome_stats
from backend.database import FeedbackRecord
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

@router.post("/incidents/{incident_id}/analyze")
async def analyze_incident(incident_id: str) -> dict:
    stored = get_incident(incident_id)
    try:
        settings = Settings()
        analyzer = RootCauseAnalyzer(HindsightMemory.from_settings(settings), GroqLlm(settings))
    except Exception:
        analyzer = RootCauseAnalyzer(memory=None)
    analysis = await analyzer.analyze(Incident.model_validate(stored["incident"]), stored["category"])
    return analysis.model_dump(mode="json")

@router.post("/incidents/{incident_id}/feedback")
async def submit_feedback(incident_id: str, feedback: Feedback) -> dict:
    try: return await process_feedback(incident_id, feedback)
    except KeyError: raise HTTPException(status_code=404, detail="Incident not found")

@router.post("/incidents/{incident_id}/approve-action")
def approve_action(incident_id: str) -> dict:
    with SessionLocal() as session:
        feedback = session.get(FeedbackRecord, incident_id)
        if not feedback: raise HTTPException(status_code=409, detail="Feedback is required before approval")
        feedback.approved = "true"; session.commit()
    return {"approved": True, "execution": "simulated only"}

@router.get("/stats/outcomes")
def stats() -> dict: return outcome_stats()

