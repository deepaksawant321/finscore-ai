import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedJSON
from app.infra.db import Base, IdMixin

ACTIVE_STATES = ("suggested", "snoozed", "accepted", "in_progress", "completed")


class UserAction(Base, IdMixin):
    """One suggested action for one user. The library entry is referenced by key; the score effect is computed per user."""

    __tablename__ = "user_actions"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    catalog_key: Mapped[str] = mapped_column(String(40))
    state: Mapped[str] = mapped_column(String(12))  # suggested|snoozed|accepted|in_progress|completed|verified|skipped|expired
    params: Mapped[dict[str, object]] = mapped_column(EncryptedJSON)  # proposed new values of stated facts
    priority_breakdown: Mapped[dict[str, str]] = mapped_column(JSONB)  # points per factor + total (no personal values)
    expected_delta: Mapped[Decimal] = mapped_column(Numeric(8, 2))  # score points, computed by the score engine
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_fact_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("facts.id", ondelete="SET NULL"), nullable=True)
    rulebook_version: Mapped[str] = mapped_column(String(40))
    official: Mapped[bool] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "uq_user_actions_active", "user_id", "catalog_key", unique=True,
            postgresql_where=text("state IN ('suggested','snoozed','accepted','in_progress','completed')"),
        ),
    )  # fmt: skip


class ActionEvent(Base, IdMixin):
    """Append-only history of state changes (feeds the timeline)."""

    __tablename__ = "action_events"
    action_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_actions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    from_state: Mapped[str | None] = mapped_column(String(12), nullable=True)
    to_state: Mapped[str] = mapped_column(String(12))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
