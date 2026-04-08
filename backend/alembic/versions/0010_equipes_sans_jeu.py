"""Suppression de la colonne jeu dans equipes_esport

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-08
"""
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE equipes_esport DROP COLUMN IF EXISTS jeu")


def downgrade():
    op.execute("ALTER TABLE equipes_esport ADD COLUMN IF NOT EXISTS jeu VARCHAR(50)")
