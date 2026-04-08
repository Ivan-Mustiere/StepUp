"""
Tests des endpoints users.
Toutes les requêtes DB sont mockées (pas de PostgreSQL requis).
"""
from datetime import datetime

from app.core.security import _create_access_token, _hash_password

# ---------------------------------------------------------------------------
# Données partagées
# ---------------------------------------------------------------------------

VALID_PASSWORD = "SecurePass1!"
HASHED_PW = _hash_password(VALID_PASSWORD)

USER_ROW = {
    "id": 1,
    "pseudo": "alice",
    "email": "alice@example.com",
    "age": 25,
    "genre": "F",
    "pays": "France",
    "region": "IDF",
    "coins": 100,
    "coins_en_jeu": 0,
    "gems": 5,
    "xp_total": 200,
    "vip": False,
    "date_creation": datetime(2024, 1, 1),
    "is_admin": False,
}

TOKEN = _create_access_token("1")
AUTH = {"Authorization": f"Bearer {TOKEN}"}


# ---------------------------------------------------------------------------
# PATCH /api/v1/users/me
# ---------------------------------------------------------------------------

class TestUpdateProfile:
    def test_succes_pseudo(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,   # _get_current_user
            None,       # pseudo disponible
            {"id": 1, "pseudo": "alice2", "email": "alice@example.com",
             "coins": 100, "xp_total": 200, "vip": False,
             "date_creation": datetime(2024, 1, 1)},
        ]
        resp = c.patch("/api/v1/users/me", json={"pseudo": "alice2"}, headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["pseudo"] == "alice2"

    def test_succes_email(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            None,  # email disponible
            {"id": 1, "pseudo": "alice", "email": "new@example.com",
             "coins": 100, "xp_total": 200, "vip": False,
             "date_creation": datetime(2024, 1, 1)},
        ]
        resp = c.patch("/api/v1/users/me", json={"email": "new@example.com"}, headers=AUTH)
        assert resp.status_code == 200

    def test_pseudo_deja_utilise(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 2}]
        resp = c.patch("/api/v1/users/me", json={"pseudo": "bob"}, headers=AUTH)
        assert resp.status_code == 409

    def test_email_deja_utilise(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None, {"id": 2}]
        resp = c.patch("/api/v1/users/me", json={"pseudo": "alice2", "email": "taken@example.com"}, headers=AUTH)
        assert resp.status_code == 409

    def test_aucun_champ(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.patch("/api/v1/users/me", json={}, headers=AUTH)
        assert resp.status_code == 400
        assert "champ" in resp.json()["detail"]

    def test_pseudo_trop_court(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.patch("/api/v1/users/me", json={"pseudo": "ab"}, headers=AUTH)
        assert resp.status_code == 422

    def test_age_trop_jeune(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.patch("/api/v1/users/me", json={"age": 12}, headers=AUTH)
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.patch("/api/v1/users/me", json={"pseudo": "alice2"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/users/me/password
# ---------------------------------------------------------------------------

class TestChangePassword:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"password_hash": HASHED_PW},
        ]
        resp = c.post(
            "/api/v1/users/me/password",
            json={"current_password": VALID_PASSWORD, "new_password": "NewPass1!"},
            headers=AUTH,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "updated"

    def test_mauvais_mot_de_passe_actuel(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"password_hash": HASHED_PW}]
        resp = c.post(
            "/api/v1/users/me/password",
            json={"current_password": "WrongPass1!", "new_password": "NewPass1!"},
            headers=AUTH,
        )
        assert resp.status_code == 400

    def test_nouveau_mdp_invalide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.post(
            "/api/v1/users/me/password",
            json={"current_password": VALID_PASSWORD, "new_password": "weak"},
            headers=AUTH,
        )
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post(
            "/api/v1/users/me/password",
            json={"current_password": VALID_PASSWORD, "new_password": "NewPass1!"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/users/{user_id}
# ---------------------------------------------------------------------------

class TestGetUserProfile:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 2, "pseudo": "bob", "avatar": None, "coins": 50,
             "xp_total": 100, "vip": False,
             "date_creation": datetime(2024, 1, 1), "communautes": []},
        ]
        resp = c.get("/api/v1/users/2", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["pseudo"] == "bob"

    def test_utilisateur_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.get("/api/v1/users/999", headers=AUTH)
        assert resp.status_code == 404

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/users/2")
        assert resp.status_code == 401
