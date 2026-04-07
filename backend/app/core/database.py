import hashlib
import logging
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras
import psycopg2.pool

from .config import DATABASE_URL, REFRESH_TOKEN_EXPIRE_DAYS

logger = logging.getLogger("stepup")

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def init_pool(minconn: int = 2, maxconn: int = 10) -> None:
    global _pool
    parsed = urlparse(DATABASE_URL)
    _pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=minconn,
        maxconn=maxconn,
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=(parsed.path or "").lstrip("/"),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    logger.info("Pool de connexions initialisé (%d–%d connexions).", minconn, maxconn)


def _connect():
    """Connexion directe — utilisée uniquement en tests (pool absent)."""
    parsed = urlparse(DATABASE_URL)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=(parsed.path or "").lstrip("/"),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


@contextmanager
def get_db():
    """Context manager : fournit une connexion depuis le pool (ou directe en tests)."""
    if _pool is None:
        conn = _connect()
        try:
            yield conn
        finally:
            conn.close()
    else:
        conn = _pool.getconn()
        try:
            yield conn
        finally:
            _pool.putconn(conn)


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
