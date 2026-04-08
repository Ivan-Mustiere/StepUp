"""Ajout de date_debut aux paris

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-08
"""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE paris ADD COLUMN IF NOT EXISTS date_debut TIMESTAMP"
    )


def downgrade():
    op.execute(
        "ALTER TABLE paris DROP COLUMN IF EXISTS date_debut"
    )
