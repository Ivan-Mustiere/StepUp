"""Ajout des équipes esport favorites (max 3) sur les utilisateurs

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-08
"""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS equipes_esport JSONB DEFAULT '[]'"
    )


def downgrade():
    op.execute(
        "ALTER TABLE users DROP COLUMN IF EXISTS equipes_esport"
    )
