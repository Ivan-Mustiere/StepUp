"""Ajoute cote_team1/cote_team2 sur pronostics et equipe_choisie sur user_paris_actifs"""
revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.execute("ALTER TABLE pronostics ADD COLUMN IF NOT EXISTS cote_team1 NUMERIC(10,2)")
    op.execute("ALTER TABLE pronostics ADD COLUMN IF NOT EXISTS cote_team2 NUMERIC(10,2)")
    op.execute("ALTER TABLE user_paris_actifs ADD COLUMN IF NOT EXISTS equipe_choisie VARCHAR(100)")


def downgrade():
    op.execute("ALTER TABLE pronostics DROP COLUMN IF EXISTS cote_team1")
    op.execute("ALTER TABLE pronostics DROP COLUMN IF EXISTS cote_team2")
    op.execute("ALTER TABLE user_paris_actifs DROP COLUMN IF EXISTS equipe_choisie")
