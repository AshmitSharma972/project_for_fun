"""Typed IncidentMind models stored through the official Hindsight client."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Incident(BaseModel):
    id: str = Field(min_length=1)
    service: str = Field(min_length=1)
    error: str = Field(min_length=1)
    severity: str = "unknown"
    symptoms: list[str] = Field(default_factory=list)
    logs_excerpt: str = ""
    suspected_cause: str | None = None
    verified_cause: str | None = None
    resolution_steps: list[str] = Field(default_factory=list)
    outcome: Literal["resolved", "failed", "partial", "unknown"] = "unknown"
    timestamps: list[datetime] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class MemoryEvidence(BaseModel):
    memory_id: str | None = None
    text: str
    raw_memory_text: str
    memory_type: str | None = None


class RetainResult(BaseModel):
    accepted: bool
    error: str | None = None


class ReflectionResult(BaseModel):
    text: str
    evidence_ids: list[str] = Field(default_factory=list)
    available: bool = True
    error: str | None = None
