import hashlib
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import psycopg
import psycopg_pool
from psycopg.rows import dict_row

from .config import DATABASE_URL, REFRESH_TOKEN_EXPIRE_DAYS

logger = logging.getLogger("stepup")

_pool: psycopg_pool.AsyncConnectionPool | None = None


async def init_pool(min_size: int = 2, max_size: int = 10) -> None:
    global _pool
    _pool = psycopg_pool.AsyncConnectionPool(
        DATABASE_URL,
        min_size=min_size,
        max_size=max_size,
        kwargs={"row_factory": dict_row},
        open=False,
    )
    await _pool.open()
    logger.info("Pool de connexions initialisé (%d–%d connexions).", min_size, max_size)


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_db():
    """Context manager : fournit une connexion depuis le pool (ou directe en tests)."""
    if _pool is None:
        conn = await psycopg.AsyncConnection.connect(DATABASE_URL, row_factory=dict_row)
        try:
            yield conn
        finally:
            await conn.close()
    else:
        async with _pool.connection() as conn:
            yield conn


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def _issue_refresh_token(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    token_hash = _hash_value(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await conn.execute(
        "INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
        (user_id, token_hash, expires_at),
    )
    return token
