"""Recorded workbook FinScore calculations (one score everywhere, audit Phase 1 item 1.2)

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-18 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "matrix_score_runs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("digest", sa.String(length=64), nullable=False),
        sa.Column("overall", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column("rule_version", sa.String(length=40), nullable=False),
        sa.Column("engine_version", sa.String(length=20), nullable=False),
        sa.Column("official", sa.Boolean(), nullable=False),
        sa.Column("factors", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_matrix_score_runs_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_matrix_score_runs")),
    )
    op.create_index("ix_matrix_score_runs_user_time", "matrix_score_runs", ["user_id", "computed_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_matrix_score_runs_user_time", table_name="matrix_score_runs")
    op.drop_table("matrix_score_runs")
