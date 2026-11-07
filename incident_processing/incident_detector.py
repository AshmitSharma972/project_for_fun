from pydantic import BaseModel, Field
from incident_processing.incident_classifier import classify
from incident_processing.log_analyzer import analyze_logs
from hindsight_memory.models import Incident

class Alert(BaseModel):
    service: str = Field(min_length=1)
    error: str = Field(min_length=1)
    cpu: float | None = None
    failed_requests: int = 0
    status: int | None = None
    logs: str = ""

def detect(alert: Alert, incident_id: str) -> tuple[Incident, str]:
    details = analyze_logs(alert.logs)
    category, severity = classify(alert.error, alert.logs, alert.cpu)
    return Incident(id=incident_id, service=alert.service, error=alert.error, severity=severity, symptoms=[str(details['signature'])], logs_excerpt=alert.logs[:4000], tags=[category.lower()]), category
