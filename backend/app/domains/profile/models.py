import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin, TimestampMixin


class Fact(Base, IdMixin, TimestampMixin):
    """Versioned, provenance-carrying financial fact. Never updated in place: a change closes the old row
    (valid_to, superseded_by) and inserts a new one."""

    __tablename__ = "facts"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    field_key: Mapped[str] = mapped_column(String(60))
    value: Mapped[str] = mapped_column(String(60))  # canonical string, see catalog.normalise_value
    source_type: Mapped[str] = mapped_column(String(20))
    source_ref: Mapped[str | None] = mapped_column(String(80), nullable=True)  # e.g. message id, 'user_correction'
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 3), default=Decimal("1.0"))
    verification_state: Mapped[str] = mapped_column(String(20), default="stated")  # stated | verified | disputed
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    superseded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (
        Index("ix_facts_user_field", "user_id", "field_key", "valid_from"),
        Index("uq_facts_current", "user_id", "field_key", unique=True, postgresql_where=text("valid_to IS NULL")),
    )


class InputSnapshot(Base, IdMixin):
    """Frozen inputs of a score run, so any result can be reproduced exactly."""

    __tablename__ = "input_snapshots"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    digest: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index("ix_input_snapshots_user_digest", "user_id", "digest"),)
