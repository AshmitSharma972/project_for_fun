import json
from pydantic import BaseModel, Field
from backend.database import FeedbackRecord, IncidentRecord, SessionLocal
from hindsight_memory.hindsight_client import Memory
from hindsight_memory.models import Incident

class Feedback(BaseModel):
    verified_cause: str = Field(min_length=1)
    steps_taken: list[str] = Field(default_factory=list)
    outcome: str
    notes: str = ""

async def process_feedback(incident_id: str, feedback: Feedback, memory: Memory | None = None) -> dict:
    with SessionLocal() as session:
        record = session.get(IncidentRecord, incident_id)
        if not record: raise KeyError(incident_id)
        existing = session.get(FeedbackRecord, incident_id)
        if not existing:
            session.add(FeedbackRecord(incident_id=incident_id, verified_cause=feedback.verified_cause, steps=json.dumps(feedback.steps_taken), outcome=feedback.outcome, notes=feedback.notes))
            session.commit()
        incident = Incident.model_validate_json(record.payload).model_copy(update={"verified_cause": feedback.verified_cause, "resolution_steps": feedback.steps_taken, "outcome": feedback.outcome})
    retained = await memory.retain_incident(incident) if memory and not existing else None
    return {"stored": True, "memory_retained": retained.accepted if retained else False}
