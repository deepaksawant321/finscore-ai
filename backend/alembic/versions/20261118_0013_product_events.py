"""First-party product analytics events (audit Phase 1 item 1.11)

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-18 15:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "product_events",
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("anon_id", sa.String(length=40), nullable=True),
        sa.Column("path", sa.String(length=200), nullable=True),
        sa.Column("props", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_product_events_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_events")),
    )
    op.create_index("ix_product_events_name_time", "product_events", ["name", "occurred_at"], unique=False)
    op.create_index("ix_product_events_user", "product_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_product_events_user", table_name="product_events")
    op.drop_index("ix_product_events_name_time", table_name="product_events")
    op.drop_table("product_events")
