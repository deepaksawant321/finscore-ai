"""actions

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-13 20:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_actions",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("catalog_key", sa.String(length=40), nullable=False),
        sa.Column("state", sa.String(length=12), nullable=False),
        sa.Column("params", sa.Text(), nullable=False),
        sa.Column("priority_breakdown", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("expected_delta", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by_fact_id", sa.UUID(), nullable=True),
        sa.Column("rulebook_version", sa.String(length=40), nullable=False),
        sa.Column("official", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_actions_user_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["verified_by_fact_id"], ["facts.id"], name=op.f("fk_user_actions_verified_by_fact_id_facts"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_actions")),
    )
    op.create_index(op.f("ix_user_actions_user_id"), "user_actions", ["user_id"], unique=False)
    op.create_index(
        "uq_user_actions_active", "user_actions", ["user_id", "catalog_key"], unique=True,
        postgresql_where=text("state IN ('suggested','snoozed','accepted','in_progress','completed')"),
    )  # fmt: skip
    op.create_table(
        "action_events",
        sa.Column("action_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("from_state", sa.String(length=12), nullable=True),
        sa.Column("to_state", sa.String(length=12), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["action_id"], ["user_actions.id"], name=op.f("fk_action_events_action_id_user_actions"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_action_events_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_action_events")),
    )
    op.create_index(op.f("ix_action_events_action_id"), "action_events", ["action_id"], unique=False)
    op.create_index(op.f("ix_action_events_user_id"), "action_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_action_events_user_id"), table_name="action_events")
    op.drop_index(op.f("ix_action_events_action_id"), table_name="action_events")
    op.drop_table("action_events")
    op.drop_index("uq_user_actions_active", table_name="user_actions")
    op.drop_index(op.f("ix_user_actions_user_id"), table_name="user_actions")
    op.drop_table("user_actions")
