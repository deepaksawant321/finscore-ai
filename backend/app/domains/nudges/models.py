import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedText
from app.infra.db import Base, IdMixin

ACTIVE_STATES = ("pending", "seen", "snoozed")


class Nudge(Base, IdMixin):
    """One Daily Companion message. A dedupe key is never reused once a nudge exists, so a dismissed nudge is not repeated."""

    __tablename__ = "nudges"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rule_key: Mapped[str] = mapped_column(String(30))
    dedupe_key: Mapped[str] = mapped_column(String(200))
    priority: Mapped[str] = mapped_column(String(10))  # critical | high | medium | low | habit
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(EncryptedText)  # may contain amounts; includes the reason it is shown
    cta_label: Mapped[str] = mapped_column(String(40))
    cta_path: Mapped[str] = mapped_column(String(60))
    state: Mapped[str] = mapped_column(String(10))  # pending | seen | snoozed | dismissed | done | expired
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("uq_nudges_dedupe", "user_id", "dedupe_key", unique=True),)


class NotificationPref(Base):
    __tablename__ = "notification_prefs"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_active: Mapped[int] = mapped_column(Integer)  # frequency control: how many nudges are shown at once
    muted_rules: Mapped[list[str]] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
