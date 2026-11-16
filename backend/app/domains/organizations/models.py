"""B2B tenancy (MVP 6): organisations, their people, API keys, metered usage and invoices.

An organisation is a customer business that plugs FinScore into its own product. End customers of that business are NOT
users of this table set: partners call the partner API with a secret key and nothing about their customers is stored.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.db import Base, IdMixin, TimestampMixin

ORG_ROLES = ("owner", "admin", "analyst", "viewer")


class Organization(Base, IdMixin, TimestampMixin):
    __tablename__ = "organizations"
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    region: Mapped[str] = mapped_column(String(20), default="india")
    plan_key: Mapped[str] = mapped_column(String(20), default="starter")
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")  # monthly | yearly
    pending_plan_key: Mapped[str | None] = mapped_column(String(20), nullable=True)  # scheduled downgrade
    pending_cycle: Mapped[str | None] = mapped_column(String(10), nullable=True)
    pending_effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    environment: Mapped[str] = mapped_column(String(10), default="sandbox")  # sandbox | live
    went_live_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    branding: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)  # validated theme; empty = product defaults
    modules: Mapped[list[str]] = mapped_column(JSONB, default=list)
    connectors: Mapped[dict[str, bool]] = mapped_column(JSONB, default=dict)
    snippet_copied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class OrgMember(Base, IdMixin):
    """A person on the team. `invited` rows have no user yet; the invite token is stored only as a hash."""

    __tablename__ = "org_members"
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320))  # lower-cased
    role: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(10), default="invited")  # invited | active
    invite_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    invite_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("org_id", "email", name="uq_org_members_org_email"),)


class ApiKey(Base, IdMixin):
    """Secret keys are shown once and kept only as a SHA-256 hash. Publishable keys are public by design, so the value is kept."""

    __tablename__ = "api_keys"
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))  # publishable | secret
    environment: Mapped[str] = mapped_column(String(10))  # test | live
    prefix: Mapped[str] = mapped_column(String(24))
    last4: Mapped[str] = mapped_column(String(4))
    key_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)  # secret keys
    public_value: Mapped[str | None] = mapped_column(String(80), nullable=True)  # publishable keys
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # rotation grace period
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UsageCounter(Base):
    """One row per org, month, environment and metric. Incremented atomically, so concurrent calls are not lost."""

    __tablename__ = "usage_counters"
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    period: Mapped[str] = mapped_column(String(7), primary_key=True)  # YYYY-MM
    environment: Mapped[str] = mapped_column(String(10), primary_key=True)
    metric: Mapped[str] = mapped_column(String(20), primary_key=True)
    count: Mapped[int] = mapped_column(BigInteger, default=0)


class Invoice(Base, IdMixin):
    """A priced month. No payment is collected here: there is no payment provider yet (needs purchase approval, K-45)."""

    __tablename__ = "invoices"
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    number: Mapped[str] = mapped_column(String(40), unique=True)
    period: Mapped[str] = mapped_column(String(7))
    plan_key: Mapped[str] = mapped_column(String(20))
    billing_cycle: Mapped[str] = mapped_column(String(10))
    base_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    overage_scores: Mapped[int] = mapped_column(Integer, default=0)
    overage_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    gst: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(10), default="open")  # open | paid | void
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("org_id", "period", name="uq_invoices_org_period"),
        Index("ix_invoices_org_issued", "org_id", "issued_at"),
    )
