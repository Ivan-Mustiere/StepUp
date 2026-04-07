"""Schema initial complet

Revision ID: 0001
Revises:
Create Date: 2026-04-07

"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            pseudo VARCHAR(255) NOT NULL,
            age INT,
            genre VARCHAR(50),
            region VARCHAR(100),
            pays VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar VARCHAR(255),
            coins INT DEFAULT 0 CHECK (coins >= 0),
            rank INT DEFAULT 0 CHECK (rank >= 0),
            xp_total INT DEFAULT 0 CHECK (xp_total >= 0),
            xp_semaine INT DEFAULT 0 CHECK (xp_semaine >= 0),
            verification_ok BOOLEAN DEFAULT FALSE,
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            derniere_utilisation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            stock_paris INT DEFAULT 0 CHECK (stock_paris >= 0),
            vip BOOLEAN DEFAULT FALSE,
            strick INT DEFAULT 0 CHECK (strick >= 0),
            stock_degel_strick INT DEFAULT 0 CHECK (stock_degel_strick >= 0),
            league_regarde VARCHAR(100),
            pas_total INT DEFAULT 0 CHECK (pas_total >= 0),
            is_admin BOOLEAN DEFAULT FALSE
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_friends (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, friend_user_id),
            CHECK (user_id <> friend_user_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_communautes (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            communaute_id INT NOT NULL,
            UNIQUE(user_id, communaute_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_clubs (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            club_id INT NOT NULL,
            type VARCHAR(50) NOT NULL CHECK (type IN ('favori', 'detest')),
            UNIQUE(user_id, club_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_jeux (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            jeu_id INT NOT NULL,
            UNIQUE(user_id, jeu_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_succes (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            succes_name VARCHAR(255) NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_historique_parie (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            paris_detail JSONB NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_pas_history (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            pas INT NOT NULL CHECK (pas >= 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_evenements (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            evenement_id INT NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_friend_requests (
            id SERIAL PRIMARY KEY,
            sender_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sender_user_id, receiver_user_id),
            CHECK (sender_user_id <> receiver_user_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_community_requests (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            communaute_id INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, communaute_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS pronostics (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            titre VARCHAR(255) NOT NULL,
            description TEXT,
            prediction VARCHAR(255) NOT NULL,
            cote NUMERIC(10, 2),
            statut VARCHAR(20) NOT NULL DEFAULT 'ouvert'
                CHECK (statut IN ('ouvert', 'termine', 'annule')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS paris (
            id SERIAL PRIMARY KEY,
            admin_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            pronostic_id INT NOT NULL REFERENCES pronostics(id) ON DELETE CASCADE,
            description TEXT,
            mise_min INT NOT NULL DEFAULT 0 CHECK (mise_min >= 0),
            statut VARCHAR(20) NOT NULL DEFAULT 'actif'
                CHECK (statut IN ('actif', 'ferme', 'regle')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_pas_history_user_date ON user_pas_history(user_id, date)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS user_refresh_tokens")
    op.execute("DROP TABLE IF EXISTS paris")
    op.execute("DROP TABLE IF EXISTS pronostics")
    op.execute("DROP TABLE IF EXISTS user_community_requests")
    op.execute("DROP TABLE IF EXISTS user_friend_requests")
    op.execute("DROP TABLE IF EXISTS user_evenements")
    op.execute("DROP TABLE IF EXISTS user_pas_history")
    op.execute("DROP TABLE IF EXISTS user_historique_parie")
    op.execute("DROP TABLE IF EXISTS user_succes")
    op.execute("DROP TABLE IF EXISTS user_jeux")
    op.execute("DROP TABLE IF EXISTS user_clubs")
    op.execute("DROP TABLE IF EXISTS user_communautes")
    op.execute("DROP TABLE IF EXISTS user_friends")
    op.execute("DROP TABLE IF EXISTS users")
