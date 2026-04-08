"""Gems, coins_en_jeu et paris actifs

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-08
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS gems INT DEFAULT 0 CHECK (gems >= 0)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS coins_en_jeu INT DEFAULT 0 CHECK (coins_en_jeu >= 0)")
    op.execute("ALTER TABLE user_pas_history ADD COLUMN IF NOT EXISTS gems_awarded INT DEFAULT 0 CHECK (gems_awarded >= 0)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_paris_actifs (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            pari_id INT NOT NULL REFERENCES paris(id) ON DELETE CASCADE,
            mise INT NOT NULL CHECK (mise > 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, pari_id)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS user_paris_actifs")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS gems")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS coins_en_jeu")
    op.execute("ALTER TABLE user_pas_history DROP COLUMN IF EXISTS gems_awarded")
