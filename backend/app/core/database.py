import hashlib
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras

from .config import DATABASE_URL, REFRESH_TOKEN_EXPIRE_DAYS

logger = logging.getLogger("stepup")


def _connect():
    parsed = urlparse(DATABASE_URL)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=(parsed.path or "").lstrip("/"),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _issue_refresh_token(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    token_hash = _hash_value(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )
    return token


def ensure_extended_schema():
    conn = None
    last_error = None
    for _ in range(15):
        try:
            conn = _connect()
            break
        except psycopg2.OperationalError as exc:
            last_error = exc
            time.sleep(1)
    if conn is None:
        logger.error("Connexion DB impossible au demarrage: %s", last_error)
        raise RuntimeError(f"Connexion DB impossible au demarrage: {last_error}")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

                CREATE TABLE IF NOT EXISTS user_friend_requests (
                    id SERIAL PRIMARY KEY,
                    sender_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    receiver_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(sender_user_id, receiver_user_id),
                    CHECK (sender_user_id <> receiver_user_id)
                );

                CREATE TABLE IF NOT EXISTS user_community_requests (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    communaute_id INT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, communaute_id)
                );

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
                );

                CREATE TABLE IF NOT EXISTS paris (
                    id SERIAL PRIMARY KEY,
                    admin_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    pronostic_id INT NOT NULL REFERENCES pronostics(id) ON DELETE CASCADE,
                    description TEXT,
                    mise_min INT NOT NULL DEFAULT 0 CHECK (mise_min >= 0),
                    statut VARCHAR(20) NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'ferme', 'regle')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_refresh_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    revoked_at TIMESTAMP
                );
                """
            )
            conn.commit()
    finally:
        conn.close()
