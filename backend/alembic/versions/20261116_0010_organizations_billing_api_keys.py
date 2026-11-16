"""organizations, team, api keys, usage and invoices (MVP 6)

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-16 17:27:45.886575
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("region", sa.String(length=20), nullable=False),
        sa.Column("plan_key", sa.String(length=20), nullable=False),
        sa.Column("billing_cycle", sa.String(length=10), nullable=False),
        sa.Column("pending_plan_key", sa.String(length=20), nullable=True),
        sa.Column("pending_cycle", sa.String(length=10), nullable=True),
        sa.Column("pending_effective_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("environment", sa.String(length=10), nullable=False),
        sa.Column("went_live_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("branding", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("modules", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("connectors", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("snippet_copied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"], ["users.id"], name=op.f("fk_organizations_created_by_users"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organizations")),
        sa.UniqueConstraint("slug", name=op.f("uq_organizations_slug")),
    )
    op.create_table(
        "api_keys",
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=12), nullable=False),
        sa.Column("environment", sa.String(length=10), nullable=False),
        sa.Column("prefix", sa.String(length=24), nullable=False),
        sa.Column("last4", sa.String(length=4), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=True),
        sa.Column("public_value", sa.String(length=80), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.id"], name=op.f("fk_api_keys_org_id_organizations"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_api_keys")),
        sa.UniqueConstraint("key_hash", name=op.f("uq_api_keys_key_hash")),
    )
    op.create_index(op.f("ix_api_keys_org_id"), "api_keys", ["org_id"], unique=False)
    op.create_table(
        "invoices",
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("number", sa.String(length=40), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("plan_key", sa.String(length=20), nullable=False),
        sa.Column("billing_cycle", sa.String(length=10), nullable=False),
        sa.Column("base_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("overage_scores", sa.Integer(), nullable=False),
        sa.Column("overage_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("gst", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.id"], name=op.f("fk_invoices_org_id_organizations"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invoices")),
        sa.UniqueConstraint("number", name=op.f("uq_invoices_number")),
        sa.UniqueConstraint("org_id", "period", name="uq_invoices_org_period"),
    )
    op.create_index(op.f("ix_invoices_org_id"), "invoices", ["org_id"], unique=False)
    op.create_index("ix_invoices_org_issued", "invoices", ["org_id", "issued_at"], unique=False)
    op.create_table(
        "org_members",
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("invite_token_hash", sa.String(length=64), nullable=True),
        sa.Column("invite_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invited_by", sa.UUID(), nullable=True),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.id"], name=op.f("fk_org_members_org_id_organizations"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_org_members_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_org_members")),
        sa.UniqueConstraint("invite_token_hash", name=op.f("uq_org_members_invite_token_hash")),
        sa.UniqueConstraint("org_id", "email", name="uq_org_members_org_email"),
    )
    op.create_index(op.f("ix_org_members_org_id"), "org_members", ["org_id"], unique=False)
    op.create_index(op.f("ix_org_members_user_id"), "org_members", ["user_id"], unique=False)
    op.create_table(
        "usage_counters",
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("environment", sa.String(length=10), nullable=False),
        sa.Column("metric", sa.String(length=20), nullable=False),
        sa.Column("count", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.id"], name=op.f("fk_usage_counters_org_id_organizations"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("org_id", "period", "environment", "metric", name=op.f("pk_usage_counters")),
    )


def downgrade() -> None:
    op.drop_table("usage_counters")
    op.drop_index(op.f("ix_org_members_user_id"), table_name="org_members")
    op.drop_index(op.f("ix_org_members_org_id"), table_name="org_members")
    op.drop_table("org_members")
    op.drop_index("ix_invoices_org_issued", table_name="invoices")
    op.drop_index(op.f("ix_invoices_org_id"), table_name="invoices")
    op.drop_table("invoices")
    op.drop_index(op.f("ix_api_keys_org_id"), table_name="api_keys")
    op.drop_table("api_keys")
    op.drop_table("organizations")
