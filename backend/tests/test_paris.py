"""
Tests des endpoints paris.
Toutes les requêtes DB sont mockées (pas de PostgreSQL requis).
"""
from datetime import datetime, timedelta

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
    "coins": 500,
    "coins_en_jeu": 0,
    "gems": 3,
    "xp_total": 0,
    "vip": False,
    "date_creation": datetime(2024, 1, 1),
    "is_admin": False,
}

TOKEN = _create_access_token("1")
AUTH = {"Authorization": f"Bearer {TOKEN}"}

PARI_ROW = {
    "id": 1,
    "description": "Pari sur T1",
    "mise_min": 10,
    "statut": "actif",
    "created_at": datetime(2024, 1, 1),
    "date_debut": None,
    "titre": "T1 vs Gen.G",
    "prediction": "Victoire T1",
    "cote": 1.5,
    "categorie": "Esport",
    "auteur": "admin",
    "deja_parie": False,
}


# ---------------------------------------------------------------------------
# GET /api/v1/paris
# ---------------------------------------------------------------------------

class TestListParis:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [PARI_ROW]
        resp = c.get("/api/v1/paris", headers=AUTH)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/paris", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_paris_termines_avec_mise_inclus(self, client):
        """Un pari terminé où l'user a parié doit apparaître."""
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [{**PARI_ROW, "statut": "regle", "deja_parie": True}]
        resp = c.get("/api/v1/paris", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()[0]["deja_parie"] is True

    def test_pagination(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/paris?limit=5&offset=10", headers=AUTH)
        assert resp.status_code == 200

    def test_limit_invalide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/paris?limit=0", headers=AUTH)
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/paris")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/paris/{id}/miser
# ---------------------------------------------------------------------------

class TestPlaceBet:
    def _user_row(self, coins=500, gems=3):
        return {**USER_ROW, "coins": coins, "gems": gems}

    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "actif", "date_debut": None},
            self._user_row(),   # FOR UPDATE
            None,               # pas encore parié
            {"coins": 400, "coins_en_jeu": 100, "gems": 2},
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 201
        data = resp.json()
        assert data["mise"] == 100
        assert data["coins_restants"] == 400
        assert data["gems_restants"] == 2

    def test_pari_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/paris/999/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 404

    def test_pari_inactif(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "ferme", "date_debut": None},
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 400
        assert "actif" in resp.json()["detail"]

    def test_mise_trop_faible(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 50, "statut": "actif", "date_debut": None},
            self._user_row(),
            None,
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 10}, headers=AUTH)
        assert resp.status_code == 400
        assert "minimum" in resp.json()["detail"]

    def test_coins_insuffisants(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "actif", "date_debut": None},
            self._user_row(coins=50),
            None,
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 200}, headers=AUTH)
        assert resp.status_code == 400
        assert "insuffisants" in resp.json()["detail"]

    def test_pas_de_gem(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "actif", "date_debut": None},
            self._user_row(gems=0),
            None,
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 400
        assert "Gem" in resp.json()["detail"]

    def test_deja_parie(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "actif", "date_debut": None},
            self._user_row(),
            {"id": 5},  # déjà parié
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 409

    def test_mise_nulle(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 0}, headers=AUTH)
        assert resp.status_code == 400

    def test_paris_fermes_avant_debut(self, client):
        """Moins de 15 min avant le début → paris fermés."""
        c, cur = client
        cutoff = datetime.now() + timedelta(minutes=10)
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1, "mise_min": 10, "statut": "actif", "date_debut": cutoff},
        ]
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100}, headers=AUTH)
        assert resp.status_code == 400
        assert "15 min" in resp.json()["detail"]

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/paris/1/miser", json={"mise": 100})
        assert resp.status_code == 401
