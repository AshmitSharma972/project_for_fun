"""Opt-in synthetic incidents; never mix these into verified production stats."""
from hindsight_memory.models import Incident

def generate_synthetic(service: str = "synthetic-api") -> Incident:
    return Incident(id="synthetic-timeout-1", service=service, error="synthetic connection timeout", severity="medium", symptoms=["synthetic fault"], tags=["synthetic=true"], outcome="unknown")
