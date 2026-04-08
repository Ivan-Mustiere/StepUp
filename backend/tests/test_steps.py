"""
Tests des endpoints steps.
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
    "gems": 5,
    "xp_total": 0,
    "vip": False,
    "date_creation": datetime(2024, 1, 1),
    "is_admin": False,
}

TOKEN = _create_access_token("1")
AUTH = {"Authorization": f"Bearer {TOKEN}"}


# ---------------------------------------------------------------------------
# POST /api/v1/steps
# ---------------------------------------------------------------------------

class TestSyncSteps:
    def test_premier_sync_sans_gems(self, client):
        """500 pas : pas encore de gem (seuil à 1000)."""
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            None,              # pas d'historique existant
            {"gems": 5},       # SELECT gems après update
        ]
        resp = c.post("/api/v1/steps", json={"pas": 500}, headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 500
        assert data["nouveaux_gems"] == 0
        assert data["prochain_gem_dans"] == 500

    def test_sync_avec_gems(self, client):
        """1500 pas : 1 gem gagné."""
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            None,
            {"gems": 6},
        ]
        resp = c.post("/api/v1/steps", json={"pas": 1500}, headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 1500
        assert data["gems_gagnes_aujourd_hui"] == 1
        assert data["nouveaux_gems"] == 1

    def test_sync_mise_a_jour_historique_existant(self, client):
        """Nouveau total supérieur à l'historique existant."""
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"pas": 800, "gems_awarded": 0},  # historique existant
            {"gems": 5},
        ]
        resp = c.post("/api/v1/steps", json={"pas": 1200}, headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 1200
        assert data["nouveaux_gems"] == 1

    def test_sync_valeur_inferieure_ignoree(self, client):
        """Envoyer moins de pas qu'en historique — conserve le max."""
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"pas": 2000, "gems_awarded": 2},
            {"gems": 7},
        ]
        resp = c.post("/api/v1/steps", json={"pas": 500}, headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 2000  # conserve le max

    def test_pas_negatifs(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.post("/api/v1/steps", json={"pas": -10}, headers=AUTH)
        assert resp.status_code == 400

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/steps", json={"pas": 1000})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/steps/today
# ---------------------------------------------------------------------------

class TestGetTodaySteps:
    def test_avec_historique(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"pas": 3000, "gems_awarded": 3},
            {"gems": 8},
        ]
        resp = c.get("/api/v1/steps/today", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 3000
        assert data["gems_gagnes_aujourd_hui"] == 3
        assert data["total_gems"] == 8

    def test_sans_historique(self, client):
        """Premier jour — aucun historique."""
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            None,           # pas d'historique
            {"gems": 5},
        ]
        resp = c.get("/api/v1/steps/today", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data["pas_aujourd_hui"] == 0
        assert data["gems_gagnes_aujourd_hui"] == 0
        assert data["prochain_gem_dans"] == 1000

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/steps/today")
        assert resp.status_code == 401
