from collections import Counter
from backend.database import FeedbackRecord, IncidentRecord, SessionLocal

def outcome_stats() -> dict:
    with SessionLocal() as session:
        rows = session.query(FeedbackRecord.outcome, IncidentRecord.category).join(IncidentRecord, IncidentRecord.id == FeedbackRecord.incident_id).all()
    outcomes, categories = Counter(outcome for outcome, _ in rows), Counter(category for _, category in rows)
    total = len(rows)
    return {"recorded_outcomes": total, "outcomes": dict(outcomes), "categories": dict(categories), "resolved_display": f"{outcomes.get('resolved', 0)} of {total} recorded"}
