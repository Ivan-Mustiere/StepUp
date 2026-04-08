"""Ajout de la colonne categorie aux pronostics

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-08
"""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE pronostics ADD COLUMN IF NOT EXISTS categorie VARCHAR(50) DEFAULT 'Autre'"
    )


def downgrade():
    op.execute(
        "ALTER TABLE pronostics DROP COLUMN IF EXISTS categorie"
    )
