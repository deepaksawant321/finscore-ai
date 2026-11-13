"""nudges

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-13 22:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "nudges",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("rule_key", sa.String(length=30), nullable=False),
        sa.Column("dedupe_key", sa.String(length=200), nullable=False),
        sa.Column("priority", sa.String(length=10), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("cta_label", sa.String(length=40), nullable=False),
        sa.Column("cta_path", sa.String(length=60), nullable=False),
        sa.Column("state", sa.String(length=10), nullable=False),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_nudges_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_nudges")),
    )
    op.create_index("uq_nudges_dedupe", "nudges", ["user_id", "dedupe_key"], unique=True)
    op.create_table(
        "notification_prefs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False),
        sa.Column("max_active", sa.Integer(), nullable=False),
        sa.Column("muted_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_notification_prefs_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_notification_prefs")),
    )


def downgrade() -> None:
    op.drop_table("notification_prefs")
    op.drop_index("uq_nudges_dedupe", table_name="nudges")
    op.drop_table("nudges")
