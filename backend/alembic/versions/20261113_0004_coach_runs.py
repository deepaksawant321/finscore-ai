"""coach runs

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-13 16:10:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "coach_runs",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("mode", sa.String(length=12), nullable=False),
        sa.Column("tools", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("llm_used", sa.Boolean(), nullable=False),
        sa.Column("prompt_version", sa.String(length=60), nullable=True),
        sa.Column("grounded", sa.Boolean(), nullable=False),
        sa.Column("fallback_reason", sa.String(length=40), nullable=True),
        sa.Column("rulebook_version", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name=op.f("fk_coach_runs_conversation_id_conversations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["message_id"], ["messages.id"], name=op.f("fk_coach_runs_message_id_messages"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_coach_runs")),
    )
    op.create_index(op.f("ix_coach_runs_conversation_id"), "coach_runs", ["conversation_id"], unique=False)
    op.create_index("ix_coach_runs_conv_time", "coach_runs", ["conversation_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_coach_runs_conv_time", table_name="coach_runs")
    op.drop_index(op.f("ix_coach_runs_conversation_id"), table_name="coach_runs")
    op.drop_table("coach_runs")
