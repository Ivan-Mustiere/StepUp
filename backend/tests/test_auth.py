"""
Tests des endpoints d'authentification.
Toutes les requêtes DB sont mockées (pas de PostgreSQL requis).
"""
from datetime import datetime

import pytest

from app.core.security import _create_access_token
from app.core.security import _hash_password

# ---------------------------------------------------------------------------
# Données partagées
# ---------------------------------------------------------------------------

VALID_PASSWORD = "SecurePass1!"
HASHED_PW = _hash_password(VALID_PASSWORD)

REGISTER_PAYLOAD = {
    "pseudo": "testuser",
    "email": "test@example.com",
    "password": VALID_PASSWORD,
}

LOGIN_PAYLOAD = {
    "email": "test@example.com",
    "password": VALID_PASSWORD,
}

# Ligne renvoyée par SELECT sur la table users (dict pour RealDictCursor)
USER_ROW = {
    "id": 1,
    "pseudo": "testuser",
    "email": "test@example.com",
    "age": None,
    "genre": None,
    "pays": None,
    "region": None,
    "coins": 100,
    "coins_en_jeu": 0,
    "gems": 0,
    "xp_total": 0,
    "vip": False,
    "date_creation": datetime(2024, 1, 1),
    "is_admin": False,
}


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_ok(self, client):
        c, _ = client
        resp = c.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_success(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            None,  # email disponible
            None,  # pseudo disponible
            {      # INSERT RETURNING
                "id": 1,
                "pseudo": "testuser",
                "email": "test@example.com",
                "coins": 100,
                "xp_total": 0,
                "vip": False,
                "date_creation": datetime(2024, 1, 1),
            },
        ]
        resp = c.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["pseudo"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "id" in data

    def test_duplicate_email(self, client):
        c, cur = client
        cur.fetchone.side_effect = [{"id": 1}]  # email déjà pris
        resp = c.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        assert resp.status_code == 409
        assert "Email" in resp.json()["detail"]

    def test_duplicate_pseudo(self, client):
        c, cur = client
        cur.fetchone.side_effect = [None, {"id": 1}]  # email ok, pseudo pris
        resp = c.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        assert resp.status_code == 409
        assert "Pseudo" in resp.json()["detail"]

    def test_weak_password(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "password": "weak"})
        assert resp.status_code == 422

    def test_password_no_uppercase(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "password": "secure1!"})
        assert resp.status_code == 422

    def test_password_no_digit(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "password": "SecurePass!"})
        assert resp.status_code == 422

    def test_invalid_email(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "email": "not-an-email"})
        assert resp.status_code == 422

    def test_pseudo_too_short(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "pseudo": "ab"})
        assert resp.status_code == 422

    def test_missing_required_fields(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/register", json={"pseudo": "testuser"})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_success(self, client):
        c, cur = client
        cur.fetchone.return_value = {"id": 1, "password_hash": HASHED_PW}
        resp = c.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_wrong_password(self, client):
        c, cur = client
        cur.fetchone.return_value = {"id": 1, "password_hash": HASHED_PW}
        resp = c.post("/api/v1/auth/login", json={**LOGIN_PAYLOAD, "password": "WrongPass1!"})
        assert resp.status_code == 401
        assert "Identifiants invalides" in resp.json()["detail"]

    def test_unknown_user(self, client):
        c, cur = client
        cur.fetchone.return_value = None
        resp = c.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
        assert resp.status_code == 401
        assert "Identifiants invalides" in resp.json()["detail"]

    def test_missing_email(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/login", json={"password": VALID_PASSWORD})
        assert resp.status_code == 422

    def test_missing_password(self, client):
        c, _ = client
        resp = c.post("/api/v1/auth/login", json={"email": "test@example.com"})
        assert resp.status_code == 422

    def test_rate_limit(self, client):
        """Le 6e appel depuis la même IP doit renvoyer 429."""
        c, cur = client
        cur.fetchone.return_value = None
        # Les 5 premiers passent (limite = 5/minute)
        for _ in range(5):
            c.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
        resp = c.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
        assert resp.status_code == 429


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

class TestRefreshToken:
    def test_success(self, client):
        c, cur = client
        future = datetime(2099, 1, 1)
        cur.fetchone.return_value = {
            "id": 1,
            "user_id": 42,
            "expires_at": future,
            "revoked_at": None,
        }
        resp = c.post("/api/v1/auth/refresh", json={"refresh_token": "any-raw-token"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_invalid_token(self, client):
        c, cur = client
        cur.fetchone.return_value = None
        resp = c.post("/api/v1/auth/refresh", json={"refresh_token": "bad-token"})
        assert resp.status_code == 401

    def test_revoked_token(self, client):
        c, cur = client
        cur.fetchone.return_value = {
            "id": 1,
            "user_id": 42,
            "expires_at": datetime(2099, 1, 1),
            "revoked_at": datetime(2024, 1, 1),
        }
        resp = c.post("/api/v1/auth/refresh", json={"refresh_token": "any-raw-token"})
        assert resp.status_code == 401

    def test_expired_token(self, client):
        c, cur = client
        cur.fetchone.return_value = {
            "id": 1,
            "user_id": 42,
            "expires_at": datetime(2000, 1, 1),
            "revoked_at": None,
        }
        resp = c.post("/api/v1/auth/refresh", json={"refresh_token": "any-raw-token"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_success_revokes_token(self, client):
        c, cur = client
        cur.rowcount = 1
        resp = c.post("/api/v1/auth/logout", json={"refresh_token": "some-token"})
        assert resp.status_code == 200
        assert resp.json()["revoked"] is True

    def test_already_revoked(self, client):
        c, cur = client
        cur.rowcount = 0  # aucune ligne mise à jour (déjà révoqué)
        resp = c.post("/api/v1/auth/logout", json={"refresh_token": "already-gone"})
        assert resp.status_code == 200
        assert resp.json()["revoked"] is False


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

class TestMe:
    def test_success(self, client):
        c, cur = client
        token = _create_access_token("1")
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["pseudo"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["coins"] == 100

    def test_no_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_invalid_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_user_not_found_in_db(self, client):
        c, cur = client
        token = _create_access_token("999")
        cur.fetchone.return_value = None  # utilisateur supprimé
        resp = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
