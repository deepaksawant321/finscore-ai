import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedJSON
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


class MatrixScoreRunRow(Base, IdMixin):
    """One recorded calculation of the workbook FinScore (the product's score since 2026-11-18, X-04).

    Written by MatrixScoringService.compute, at most one row per distinct input digest in a row, so the Home page can show the
    latest audited score without recalculating on every view, and the coach can say how it changed. Factor points are encrypted.
    """

    __tablename__ = "matrix_score_runs"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    digest: Mapped[str] = mapped_column(String(64))
    overall: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    rule_version: Mapped[str] = mapped_column(String(40))
    engine_version: Mapped[str] = mapped_column(String(20))
    official: Mapped[bool] = mapped_column(Boolean)
    factors: Mapped[dict[str, dict[str, object]]] = mapped_column(EncryptedJSON)  # id -> {name, points, factor_score, status}

    __table_args__ = (Index("ix_matrix_score_runs_user_time", "user_id", "computed_at"),)
