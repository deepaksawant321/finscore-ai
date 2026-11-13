import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin


class CoachRun(Base, IdMixin):
    """Audit record of one coach turn: which mode/tools ran, whether an LLM was used, and whether grounding passed.
    Holds no user text or financial values (those live encrypted in messages)."""

    __tablename__ = "coach_runs"
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"))
    mode: Mapped[str] = mapped_column(String(12))  # explain | diagnose | simulate | act | other
    tools: Mapped[list[str]] = mapped_column(JSONB)
    llm_used: Mapped[bool] = mapped_column(Boolean)
    prompt_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    grounded: Mapped[bool] = mapped_column(Boolean)  # False => LLM text was rejected and the template reply was used
    fallback_reason: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rulebook_version: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_coach_runs_conv_time", "conversation_id", "created_at"),)
