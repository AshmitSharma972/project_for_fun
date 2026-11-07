import os

from sqlalchemy import String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.getenv("INCIDENTMIND_DATABASE_URL", "sqlite:///./incidentmind.sqlite3")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine)
class Base(DeclarativeBase): pass
class IncidentRecord(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    service: Mapped[str] = mapped_column(String)
    error: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    payload: Mapped[str] = mapped_column(Text)
class FeedbackRecord(Base):
    __tablename__ = "feedback"
    incident_id: Mapped[str] = mapped_column(String, primary_key=True)
    verified_cause: Mapped[str] = mapped_column(Text)
    steps: Mapped[str] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(String)
    notes: Mapped[str] = mapped_column(Text, default="")
    approved: Mapped[str] = mapped_column(String, default="false")
