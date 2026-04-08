"""
Tests des endpoints messages privés.
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

MESSAGE_ROW = {
    "id": 1,
    "sender_id": 1,
    "receiver_id": 2,
    "contenu": "Salut !",
    "created_at": datetime(2024, 1, 1),
    "is_mine": True,
}


# ---------------------------------------------------------------------------
# GET /api/v1/messages/{friend_id}
# ---------------------------------------------------------------------------

class TestGetConversation:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]  # ami
        cur.fetchall.return_value = [MESSAGE_ROW]
        resp = c.get("/api/v1/messages/2", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["contenu"] == "Salut !"

    def test_conversation_vide(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/messages/2", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_non_ami(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]  # pas ami
        resp = c.get("/api/v1/messages/2", headers=AUTH)
        assert resp.status_code == 403

    def test_limit_invalide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.get("/api/v1/messages/2?limit=0", headers=AUTH)
        assert resp.status_code == 422

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/messages/2")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/messages/{friend_id}
# ---------------------------------------------------------------------------

class TestSendPrivateMessage:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 1},  # ami
            {"id": 10, "created_at": datetime(2024, 1, 1)},  # INSERT RETURNING
        ]
        resp = c.post("/api/v1/messages/2", json={"contenu": "Salut !"}, headers=AUTH)
        assert resp.status_code == 201
        data = resp.json()
        assert data["contenu"] == "Salut !"
        assert data["sender_id"] == 1
        assert data["receiver_id"] == 2
        assert data["is_mine"] is True

    def test_non_ami(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/messages/2", json={"contenu": "Salut !"}, headers=AUTH)
        assert resp.status_code == 403

    def test_message_vide(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        resp = c.post("/api/v1/messages/2", json={"contenu": "   "}, headers=AUTH)
        assert resp.status_code == 400

    def test_message_trop_long(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, {"id": 1}]
        resp = c.post("/api/v1/messages/2", json={"contenu": "x" * 1001}, headers=AUTH)
        assert resp.status_code == 400

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/messages/2", json={"contenu": "Salut !"})
        assert resp.status_code == 401
