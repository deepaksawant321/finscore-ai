import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin, TimestampMixin


class Goal(Base, IdMixin, TimestampMixin):
    __tablename__ = "goals"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(80))
    target_amount_today: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # in today's rupees
    target_date: Mapped[date] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(14))  # essential | important | aspirational
    current_funding: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal(0))
    monthly_funding: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal(0))
    status: Mapped[str] = mapped_column(String(12), default="active")  # active | achieved | archived
    source: Mapped[str] = mapped_column(String(20), default="user")  # user | ai_confirmed (MVP 4 discovery)

    __table_args__ = (Index("ix_goals_user_status", "user_id", "status"),)
