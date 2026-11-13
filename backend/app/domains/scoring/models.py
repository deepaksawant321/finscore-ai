import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin


class ScoreRun(Base, IdMixin):
    """Immutable record of one score computation (blueprint: store every score version and its factors)."""

    __tablename__ = "score_runs"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    snapshot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("input_snapshots.id"))
    rulebook_version: Mapped[str] = mapped_column(String(40))
    rule_set: Mapped[str] = mapped_column(String(80))
    official: Mapped[bool] = mapped_column(Boolean)
    engine_version: Mapped[str] = mapped_column(String(20))
    overall: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    reference: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    stage: Mapped[str] = mapped_column(String(30))
    stage_provisional: Mapped[bool] = mapped_column(Boolean)
    trend: Mapped[str] = mapped_column(String(12))  # improving | stable | declining | new
    pillars: Mapped[list[dict[str, object]]] = mapped_column(JSONB)
    missing_inputs: Mapped[list[str]] = mapped_column(JSONB)
    dna: Mapped[list[dict[str, object]]] = mapped_column(JSONB)
    persona: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_score_runs_user_time", "user_id", "computed_at"),)
