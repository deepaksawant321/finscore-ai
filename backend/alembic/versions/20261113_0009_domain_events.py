"""domain events (Wealth OS outbox)

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-14 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "domain_events",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.String(length=30), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.String(length=100), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_domain_events_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_domain_events")),
    )
    op.create_index(op.f("ix_domain_events_user_id"), "domain_events", ["user_id"], unique=False)
    op.create_index(
        "ix_domain_events_pending", "domain_events", ["occurred_at"], unique=False, postgresql_where=text("dispatched_at IS NULL")
    )


def downgrade() -> None:
    op.drop_index("ix_domain_events_pending", table_name="domain_events")
    op.drop_index(op.f("ix_domain_events_user_id"), table_name="domain_events")
    op.drop_table("domain_events")
