import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin


class DomainEvent(Base, IdMixin):
    """Wealth OS outbox (AC-20): one row per domain event (FactChanged, ScoreComputed, GoalUpdated, ActionVerified).
    Always inserted in the SAME transaction as the write that caused it, so the event can never be lost even if the
    app crashes before a background dispatcher runs (the "outbox" pattern — reliability without a message broker).

    The payload holds only ids and short enum-like strings, NEVER a money value, fact value or name: nothing in this
    table needs encryption, and a consumer that needs a value re-reads it from the owning table by id."""

    __tablename__ = "domain_events"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(30))
    payload: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(String(100), nullable=True)  # exception type name only, never its text

    __table_args__ = (
        Index("ix_domain_events_pending", "occurred_at", postgresql_where=text("dispatched_at IS NULL")),
    )  # fmt: skip
