"""Ajoute cote_appliquee sur user_paris_actifs pour figer la cote au moment du pari"""
revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

from alembic import op


def upgrade():
    op.execute("ALTER TABLE user_paris_actifs ADD COLUMN IF NOT EXISTS cote_appliquee NUMERIC(10,2)")


def downgrade():
    op.execute("ALTER TABLE user_paris_actifs DROP COLUMN IF EXISTS cote_appliquee")
