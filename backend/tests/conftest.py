import os

# Doit être défini avant tout import de app.main (le module plante sinon).
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only-must-32c!"

from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app


def make_cursor():
    cur = MagicMock()
    # Support du context manager : `with conn.cursor() as cur:`
    cur.__enter__ = lambda s: cur
    cur.__exit__ = MagicMock(return_value=False)
    return cur


def make_conn():
    cur = make_cursor()
    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


@pytest.fixture
def db(monkeypatch):
    """Mock psycopg2 : remplace _connect() pour tous les appels (startup inclus)."""
    conn, cur = make_conn()
    monkeypatch.setattr("app.main._connect", lambda: conn)
    return conn, cur


@pytest.fixture
def client(db):
    """TestClient FastAPI avec la DB mockée. Retourne (client, cursor_mock)."""
    with TestClient(app) as c:
        yield c, db[1]
