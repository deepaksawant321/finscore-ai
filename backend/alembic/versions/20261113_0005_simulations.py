"""simulations

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-13 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "simulations",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("scenario", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("rulebook_version", sa.String(length=40), nullable=False),
        sa.Column("engine_version", sa.String(length=20), nullable=False),
        sa.Column("official", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_simulations_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_simulations")),
    )
    op.create_index("ix_simulations_user_time", "simulations", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_simulations_user_time", table_name="simulations")
    op.drop_table("simulations")
