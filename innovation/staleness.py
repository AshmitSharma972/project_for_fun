from hindsight_memory.models import Incident

def conflicts(newer: Incident, older: Incident) -> bool:
    return newer.service == older.service and set(newer.symptoms) == set(older.symptoms) and newer.verified_cause and older.verified_cause and newer.verified_cause != older.verified_cause

def staleness_notice(newer: Incident, older: Incident) -> str | None:
    return f"Memory {older.id} is possibly outdated; it conflicts with newer verified incident {newer.id}." if conflicts(newer, older) else None
