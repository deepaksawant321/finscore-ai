import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base


class UserProgress(Base):
    """Money Map rewards. Never read by any score: points, badges and active weeks reward finishing, not wealth."""

    __tablename__ = "user_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)  # [{key, at}]
    active_weeks: Mapped[int] = mapped_column(Integer, default=0)  # weeks with any activity; a missed week pauses, never resets
    last_active_week: Mapped[str | None] = mapped_column(String(8), nullable=True)  # ISO week, e.g. 2026-W47
    last_checkin_week: Mapped[str | None] = mapped_column(String(8), nullable=True)  # the weekly "anything changed?" card
    rewards_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
