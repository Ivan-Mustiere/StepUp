"""Communautés et messages de chat

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-07

"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS communautes (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            description TEXT,
            jeu VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS communaute_messages (
            id SERIAL PRIMARY KEY,
            communaute_id INT NOT NULL REFERENCES communautes(id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            contenu TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_communaute
        ON communaute_messages(communaute_id, created_at)
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS communaute_messages")
    op.execute("DROP TABLE IF EXISTS communautes")
