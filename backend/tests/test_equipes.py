"""
Tests des endpoints équipes esport.
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

EQUIPE_ROW = {"id": 1, "nom": "T1", "logo_url": None, "couleur": "#C89B3C"}


# ---------------------------------------------------------------------------
# GET /api/v1/equipes
# ---------------------------------------------------------------------------

class TestListEquipes:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [EQUIPE_ROW, {"id": 2, "nom": "Gen.G", "logo_url": None, "couleur": "#000000"}]
        resp = c.get("/api/v1/equipes", headers=AUTH)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/equipes", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/equipes")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/equipes/me
# ---------------------------------------------------------------------------

class TestGetMyEquipes:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [EQUIPE_ROW]
        resp = c.get("/api/v1/equipes/me", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()[0]["nom"] == "T1"

    def test_aucune_equipe(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/equipes/me", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/equipes/me")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/v1/equipes/me
# ---------------------------------------------------------------------------

class TestSetMyEquipes:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.side_effect = [
            [{"id": 1}, {"id": 2}],  # vérification existence
            [EQUIPE_ROW, {"id": 2, "nom": "Gen.G", "logo_url": None, "couleur": "#000"}],  # résultat final
        ]
        resp = c.put("/api/v1/equipes/me", json={"equipe_ids": [1, 2]}, headers=AUTH)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_liste_vide(self, client):
        """Réinitialiser ses équipes."""
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.put("/api/v1/equipes/me", json={"equipe_ids": []}, headers=AUTH)
        assert resp.status_code == 200

    def test_trop_dequipes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.put("/api/v1/equipes/me", json={"equipe_ids": [1, 2, 3, 4]}, headers=AUTH)
        assert resp.status_code == 400
        assert "3" in resp.json()["detail"]

    def test_equipe_introuvable(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [{"id": 1}]  # id 999 manquant
        resp = c.put("/api/v1/equipes/me", json={"equipe_ids": [1, 999]}, headers=AUTH)
        assert resp.status_code == 404

    def test_sans_token(self, client):
        c, _ = client
        resp = c.put("/api/v1/equipes/me", json={"equipe_ids": [1]})
        assert resp.status_code == 401
