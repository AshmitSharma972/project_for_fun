from backend.api import create_incident, get_incident
from incident_processing.incident_detector import Alert, detect
from incident_processing.log_analyzer import normalize_log


def test_log_normalization_removes_ids_and_ips() -> None:
    assert normalize_log("ERROR id=abc123def456 IP 10.0.0.1") == normalize_log("ERROR id=fff111aaa222 IP 192.168.1.9")


def test_category_table() -> None:
    cases = [("database connection pool", "", "Database"), ("HTTP API timeout", "", "API"), ("slow request", "CPU overload", "Overload"), ("DNS lookup failed", "", "Network"), ("deploy rollback failed", "", "Deployment"), ("slow latency", "", "Performance")]
    for error, logs, expected in cases:
        _, category = detect(Alert(service="svc", error=error, logs=logs), "x")
        assert category == expected


def test_create_and_get_incident() -> None:
    created = create_incident(Alert(service="payments", error="connection pool timeout", logs="database error"))
    found = get_incident(created["incident"]["id"])
    assert found["incident"]["service"] == "payments"
    assert found["category"] == "Database"
