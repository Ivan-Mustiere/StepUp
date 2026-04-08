"""Table dédiée equipes_esport + liaison user_equipes_esport

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-08
"""
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS equipes_esport (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(100) NOT NULL UNIQUE,
            jeu VARCHAR(50) NOT NULL,
            logo_url TEXT,
            couleur VARCHAR(7) NOT NULL DEFAULT '#2563eb',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_equipes_esport (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            equipe_id INT NOT NULL REFERENCES equipes_esport(id) ON DELETE CASCADE,
            UNIQUE(user_id, equipe_id)
        )
    """)
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS equipes_esport")


def downgrade():
    op.execute("DROP TABLE IF EXISTS user_equipes_esport")
    op.execute("DROP TABLE IF EXISTS equipes_esport")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS equipes_esport JSONB DEFAULT '[]'")
