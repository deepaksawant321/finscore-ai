import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin


class ProductEvent(Base, IdMixin):
    """First-party product analytics (audit Phase 1 item 1.11): which steps people take, never what they answered.

    Names come from an allow-list and properties are restricted to a few non-personal keys (service.py). Signed-in events carry
    the user id (deleted with the account); events before sign-in carry only a random browser id.
    """

    __tablename__ = "product_events"
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    name: Mapped[str] = mapped_column(String(60))
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    anon_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    path: Mapped[str | None] = mapped_column(String(200), nullable=True)
    props: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)

    __table_args__ = (Index("ix_product_events_name_time", "name", "occurred_at"), Index("ix_product_events_user", "user_id"))
