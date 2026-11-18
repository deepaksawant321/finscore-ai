"""Money Map progress (points, badges, active weeks)

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-18 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_progress",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("badges", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("active_weeks", sa.Integer(), nullable=False),
        sa.Column("last_active_week", sa.String(length=8), nullable=True),
        sa.Column("last_checkin_week", sa.String(length=8), nullable=True),
        sa.Column("rewards_enabled", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_progress_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_user_progress")),
    )


def downgrade() -> None:
    op.drop_table("user_progress")
