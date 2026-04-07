"""Messages privés entre amis

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-07

"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS messages_prives (
            id SERIAL PRIMARY KEY,
            sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            contenu TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CHECK (sender_id <> receiver_id)
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_prives_conversation
        ON messages_prives (
            LEAST(sender_id, receiver_id),
            GREATEST(sender_id, receiver_id),
            created_at
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS messages_prives")
