import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedJSON, EncryptedText
from app.infra.db import Base, IdMixin, TimestampMixin


class Conversation(Base, IdMixin, TimestampMixin):
    __tablename__ = "conversations"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mode: Mapped[str] = mapped_column(String(12))  # problem | full
    status: Mapped[str] = mapped_column(String(12), default="active")
    intents: Mapped[list[str]] = mapped_column(JSONB, default=list)
    awaiting_field: Mapped[str | None] = mapped_column(String(60), nullable=True)


class Message(Base, IdMixin):
    __tablename__ = "messages"
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(12))  # user | assistant
    content: Mapped[str] = mapped_column(EncryptedText)  # encrypted at application level
    advice_class: Mapped[str | None] = mapped_column(String(20), nullable=True)  # assistant messages only
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index("ix_messages_conv_time", "conversation_id", "created_at"),)


class MessageExtraction(Base, IdMixin):
    """Fact proposals extracted from one user message. Nothing here is a stored fact until the user accepts it."""

    __tablename__ = "message_extractions"
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    proposals: Mapped[list[dict[str, object]]] = mapped_column(EncryptedJSON)  # [{id, field_key, value, evidence, ..., status}]
    schema_version: Mapped[str] = mapped_column(String(10), default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
