import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.crypto import EncryptedJSON
from app.infra.db import Base, IdMixin


class Simulation(Base, IdMixin):
    """A what-if run. Simulations never write facts or score runs; they are reproducible from the stored scenario + versions."""

    __tablename__ = "simulations"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(20))  # score_what_if | invest | goal_what_if
    scenario: Mapped[dict[str, object]] = mapped_column(EncryptedJSON)
    result: Mapped[dict[str, object]] = mapped_column(EncryptedJSON)
    rulebook_version: Mapped[str] = mapped_column(String(40))
    engine_version: Mapped[str] = mapped_column(String(20))
    official: Mapped[bool] = mapped_column(Boolean)  # False while any rule it depends on is unapproved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_simulations_user_time", "user_id", "created_at"),)
