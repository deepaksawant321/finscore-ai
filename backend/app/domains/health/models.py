import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedJSON
from app.infra.db import Base, IdMixin


class HealthSnapshot(Base, IdMixin):
    """One recorded health check. A new row is written only when the vitals or their freshness actually changed."""

    __tablename__ = "health_snapshots"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    digest: Mapped[str] = mapped_column(String(64))
    vitals: Mapped[dict[str, dict[str, object]]] = mapped_column(EncryptedJSON)  # key -> {status, known, stale, value}
    events: Mapped[list[dict[str, str]]] = mapped_column(EncryptedJSON)  # what changed versus the previous snapshot
    overall: Mapped[str] = mapped_column(String(10))
    data_quality: Mapped[str] = mapped_column(String(10))
    rulebook_version: Mapped[str] = mapped_column(String(40))
    official: Mapped[bool] = mapped_column(Boolean)

    __table_args__ = (Index("ix_health_snapshots_user_time", "user_id", "taken_at"),)
