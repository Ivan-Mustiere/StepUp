"""Récompense quotidienne (connexion journalière)

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-08
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS derniere_recompense_date DATE"
    )


def downgrade():
    op.execute(
        "ALTER TABLE users DROP COLUMN IF EXISTS derniere_recompense_date"
    )
