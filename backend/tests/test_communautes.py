"""
Tests des endpoints communautés.
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
    "xp_total": 200,
    "vip": False,
    "date_creation": datetime(2024, 1, 1),
    "is_admin": False,
}

TOKEN = _create_access_token("1")
AUTH = {"Authorization": f"Bearer {TOKEN}"}

COMMUNAUTE_ROW = {
    "id": 1,
    "nom": "LoL France",
    "description": "Communauté League of Legends",
    "jeu": "Esport",
    "created_at": datetime(2024, 1, 1),
    "nb_membres": 5,
    "est_membre": False,
}

MESSAGE_ROW = {
    "id": 1,
    "user_id": 1,
    "contenu": "Bonjour !",
    "created_at": datetime(2024, 1, 1),
    "pseudo": "alice",
}


# ---------------------------------------------------------------------------
# GET /api/v1/communautes
# ---------------------------------------------------------------------------

class TestListCommunautes:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [COMMUNAUTE_ROW]
        resp = c.get("/api/v1/communautes", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["nom"] == "LoL France"

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/communautes", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/communautes")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/communautes/{id}/rejoindre
# ---------------------------------------------------------------------------

class TestJoinCommunity:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        resp = c.post("/api/v1/communautes/1/rejoindre", headers=AUTH)
        assert resp.status_code == 201
        assert resp.json()["status"] == "membre"

    def test_communaute_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/communautes/999/rejoindre", headers=AUTH)
        assert resp.status_code == 404

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/communautes/1/rejoindre")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/v1/communautes/{id}/quitter
# ---------------------------------------------------------------------------

class TestLeaveCommunity:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 1
        resp = c.delete("/api/v1/communautes/1/quitter", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["status"] == "quitte"

    def test_pas_membre(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 0
        resp = c.delete("/api/v1/communautes/1/quitter", headers=AUTH)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/communautes/{id}/classement
# ---------------------------------------------------------------------------

class TestClassement:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        cur.fetchall.return_value = [
            {"id": 1, "pseudo": "alice", "xp_total": 200, "coins": 100, "vip": False, "rang": 1}
        ]
        resp = c.get("/api/v1/communautes/1/classement", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["rang"] == 1

    def test_communaute_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.get("/api/v1/communautes/999/classement", headers=AUTH)
        assert resp.status_code == 404

    def test_limit_invalide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/communautes/1/classement?limit=0", headers=AUTH)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/communautes/{id}/messages
# ---------------------------------------------------------------------------

class TestGetMessages:
    def test_succes_membre(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]  # membre
        cur.fetchall.return_value = [MESSAGE_ROW]
        resp = c.get("/api/v1/communautes/1/messages", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()[0]["contenu"] == "Bonjour !"

    def test_non_membre(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]  # pas membre
        resp = c.get("/api/v1/communautes/1/messages", headers=AUTH)
        assert resp.status_code == 403

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/communautes/1/messages", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/v1/communautes/{id}/messages
# ---------------------------------------------------------------------------

class TestSendMessage:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1},   # membre
            {"id": 42, "created_at": datetime(2024, 1, 1)},  # INSERT RETURNING
        ]
        resp = c.post("/api/v1/communautes/1/messages", json={"contenu": "Salut !"}, headers=AUTH)
        assert resp.status_code == 201
        data = resp.json()
        assert data["contenu"] == "Salut !"
        assert data["pseudo"] == "alice"

    def test_non_membre(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/communautes/1/messages", json={"contenu": "Salut !"}, headers=AUTH)
        assert resp.status_code == 403

    def test_message_vide(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        resp = c.post("/api/v1/communautes/1/messages", json={"contenu": "   "}, headers=AUTH)
        assert resp.status_code == 400
        assert "vide" in resp.json()["detail"]

    def test_message_trop_long(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        resp = c.post("/api/v1/communautes/1/messages", json={"contenu": "x" * 501}, headers=AUTH)
        assert resp.status_code == 400
        assert "long" in resp.json()["detail"]

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/communautes/1/messages", json={"contenu": "Salut !"})
        assert resp.status_code == 401
