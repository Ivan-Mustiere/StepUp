"""
Tests des endpoints admin.
Toutes les requêtes DB sont mockées (pas de PostgreSQL requis).
"""
from datetime import datetime

from app.core.security import _create_access_token

# ---------------------------------------------------------------------------
# Données partagées
# ---------------------------------------------------------------------------

USER_ROW = {
    "id": 1,
    "pseudo": "alice",
    "email": "alice@example.com",
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

ADMIN_ROW = {**USER_ROW, "id": 2, "pseudo": "admin", "email": "admin@example.com", "is_admin": True}

USER_TOKEN = _create_access_token("1")
ADMIN_TOKEN = _create_access_token("2")

USER_AUTH = {"Authorization": f"Bearer {USER_TOKEN}"}
ADMIN_AUTH = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

CREATE_PARI_PAYLOAD = {
    "pronostic_id": 1,
    "description": "Pari sur T1",
    "mise_min": 10,
}


# ---------------------------------------------------------------------------
# POST /api/v1/admin/paris
# ---------------------------------------------------------------------------

class TestCreateBetAdmin:
    def test_succes_admin(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            ADMIN_ROW,          # _get_current_user
            {"id": 1},          # pronostic existe
            {"id": 5, "statut": "actif", "created_at": datetime(2024, 1, 1)},  # INSERT RETURNING
        ]
        resp = c.post("/api/v1/admin/paris", json=CREATE_PARI_PAYLOAD, headers=ADMIN_AUTH)
        assert resp.status_code == 201
        data = resp.json()
        assert data["statut"] == "actif"
        assert "pari_id" in data

    def test_refuse_non_admin(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW  # is_admin = False
        resp = c.post("/api/v1/admin/paris", json=CREATE_PARI_PAYLOAD, headers=USER_AUTH)
        assert resp.status_code == 403

    def test_pronostic_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            ADMIN_ROW,
            None,   # pronostic introuvable
        ]
        resp = c.post(
            "/api/v1/admin/paris",
            json={**CREATE_PARI_PAYLOAD, "pronostic_id": 999},
            headers=ADMIN_AUTH,
        )
        assert resp.status_code == 404

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/admin/paris", json=CREATE_PARI_PAYLOAD)
        assert resp.status_code == 401

    def test_mise_min_defaut(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            ADMIN_ROW,
            {"id": 1},
            {"id": 6, "statut": "actif", "created_at": datetime(2024, 1, 1)},
        ]
        resp = c.post(
            "/api/v1/admin/paris",
            json={"pronostic_id": 1},
            headers=ADMIN_AUTH,
        )
        assert resp.status_code == 201

    def test_champs_requis_manquants(self, client):
        c, cur = client
        cur.fetchone.return_value = ADMIN_ROW
        resp = c.post("/api/v1/admin/paris", json={}, headers=ADMIN_AUTH)
        assert resp.status_code == 422
