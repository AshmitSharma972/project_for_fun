def classify(error: str, logs: str, cpu: float | None = None) -> tuple[str, str]:
    text = f"{error} {logs}".lower()
    if any(x in text for x in ("database", "connection pool", "sql", "deadlock")): category = "Database"
    elif any(x in text for x in ("timeout", "http", "api", "502", "503")): category = "API"
    elif cpu is not None and cpu >= 85 or any(x in text for x in ("overload", "cpu", "out of memory")): category = "Overload"
    elif any(x in text for x in ("dns", "network", "socket", "connection refused")): category = "Network"
    elif any(x in text for x in ("deploy", "release", "migration", "rollback")): category = "Deployment"
    else: category = "Performance"
    severity = "critical" if any(x in text for x in ("outage", "fatal", "500", "critical")) else "high" if cpu and cpu >= 85 else "medium"
    return category, severity
