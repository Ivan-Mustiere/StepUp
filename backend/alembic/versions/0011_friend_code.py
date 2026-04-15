"""Ajout du code ami sur les utilisateurs

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-09
"""
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS friend_code VARCHAR(14) UNIQUE
    """)
    # Générer un code pour les utilisateurs existants
    op.execute("""
        UPDATE users
        SET friend_code = LOWER(
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
        )
        WHERE friend_code IS NULL
    """)
    op.execute("ALTER TABLE users ALTER COLUMN friend_code SET NOT NULL")


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS friend_code")
