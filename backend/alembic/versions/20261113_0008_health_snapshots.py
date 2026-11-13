"""health snapshots

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-13 23:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "health_snapshots",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("digest", sa.String(length=64), nullable=False),
        sa.Column("vitals", sa.Text(), nullable=False),
        sa.Column("events", sa.Text(), nullable=False),
        sa.Column("overall", sa.String(length=10), nullable=False),
        sa.Column("data_quality", sa.String(length=10), nullable=False),
        sa.Column("rulebook_version", sa.String(length=40), nullable=False),
        sa.Column("official", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_health_snapshots_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_health_snapshots")),
    )
    op.create_index("ix_health_snapshots_user_time", "health_snapshots", ["user_id", "taken_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_health_snapshots_user_time", table_name="health_snapshots")
    op.drop_table("health_snapshots")
