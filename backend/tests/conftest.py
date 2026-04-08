import os
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

# Doit être défini avant tout import de app.main (le module plante sinon).
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only-must-32c!"

import pytest
from fastapi.testclient import TestClient

from app.main import app


def make_cursor():
    """
    Curseur mock supportant 'async with conn.cursor() as cur:'.
    cursor() est une méthode SYNC dans psycopg3 — on utilise MagicMock.
    Les opérations sur le curseur (execute, fetchone…) sont async.
    """
    cur = MagicMock()
    # Support async context manager : async with cur
    cur.__aenter__ = AsyncMock(return_value=cur)
    cur.__aexit__ = AsyncMock(return_value=False)
    # Opérations DB async
    cur.execute = AsyncMock()
    cur.fetchone = AsyncMock(return_value=None)
    cur.fetchall = AsyncMock(return_value=[])
    return cur


def make_conn():
    cur = make_cursor()
    conn = AsyncMock()
    # cursor() est SYNC dans psycopg3 → MagicMock, pas AsyncMock
    conn.cursor = MagicMock(return_value=cur)
    return conn, cur


@pytest.fixture
def db(monkeypatch):
    """Mock psycopg3 async : remplace get_db() et init_pool() pour tous les appels."""
    conn, cur = make_conn()

    @asynccontextmanager
    async def mock_get_db():
        yield conn

    monkeypatch.setattr("app.core.database.get_db", mock_get_db)
    monkeypatch.setattr("app.core.security._db.get_db", mock_get_db)
    monkeypatch.setattr("app.main.init_pool", AsyncMock())
    monkeypatch.setattr("app.main.close_pool", AsyncMock())
    return conn, cur


@pytest.fixture
def client(db):
    """TestClient FastAPI avec la DB mockée. Retourne (client, cursor_mock)."""
    with TestClient(app) as c:
        yield c, db[1]
