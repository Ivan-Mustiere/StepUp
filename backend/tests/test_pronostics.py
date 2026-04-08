"""
Tests des endpoints pronostics.
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

TOKEN = _create_access_token("1")
AUTH = {"Authorization": f"Bearer {TOKEN}"}

PRONOSTIC_ROW = {
    "id": 1,
    "titre": "T1 va gagner",
    "description": "T1 est en grande forme",
    "prediction": "Victoire T1",
    "cote": 1.5,
    "statut": "ouvert",
    "created_at": datetime(2024, 1, 1),
    "auteur": "alice",
}

CREATE_PAYLOAD = {
    "titre": "T1 va gagner",
    "prediction": "Victoire T1",
    "description": "T1 est en grande forme",
    "cote": 1.5,
}


# ---------------------------------------------------------------------------
# GET /api/v1/pronostics
# ---------------------------------------------------------------------------

class TestListPronostics:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [PRONOSTIC_ROW]
        resp = c.get("/api/v1/pronostics", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["titre"] == "T1 va gagner"

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/pronostics", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_filtre_statut(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [PRONOSTIC_ROW]
        resp = c.get("/api/v1/pronostics?statut=ouvert", headers=AUTH)
        assert resp.status_code == 200

    def test_pagination(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/pronostics?limit=5&offset=10", headers=AUTH)
        assert resp.status_code == 200

    def test_limit_invalide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/pronostics?limit=0", headers=AUTH)
        assert resp.status_code == 422

    def test_limit_trop_grand(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/pronostics?limit=101", headers=AUTH)
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/pronostics")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/pronostics
# ---------------------------------------------------------------------------

class TestCreatePronostic:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "statut": "ouvert", "created_at": datetime(2024, 1, 1)},
        ]
        resp = c.post("/api/v1/pronostics", json=CREATE_PAYLOAD, headers=AUTH)
        assert resp.status_code == 201
        data = resp.json()
        assert data["statut"] == "ouvert"
        assert "pronostic_id" in data

    def test_sans_description_ni_cote(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 2, "statut": "ouvert", "created_at": datetime(2024, 1, 1)},
        ]
        resp = c.post(
            "/api/v1/pronostics",
            json={"titre": "Mon prono", "prediction": "Victoire"},
            headers=AUTH,
        )
        assert resp.status_code == 201

    def test_champs_requis_manquants(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.post("/api/v1/pronostics", json={"titre": "Sans prediction"}, headers=AUTH)
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/pronostics", json=CREATE_PAYLOAD)
        assert resp.status_code == 401
