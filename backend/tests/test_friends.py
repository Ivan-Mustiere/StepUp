"""
Tests des endpoints friends.
Toutes les requêtes DB sont mockées (pas de PostgreSQL requis).
"""
from datetime import datetime

import pytest

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

FRIEND_ROW = {
    "id": 2,
    "pseudo": "bob",
    "avatar": None,
    "coins": 50,
    "xp_total": 10,
    "vip": False,
    "communautes": [],
}

REQUEST_ROW = {
    "id": 10,
    "sender_user_id": 2,
    "receiver_user_id": 1,
    "status": "pending",
    "pseudo": "bob",
    "email": "bob@example.com",
    "created_at": datetime(2024, 1, 1),
}


# ---------------------------------------------------------------------------
# GET /api/v1/friends
# ---------------------------------------------------------------------------

class TestListFriends:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [FRIEND_ROW]
        resp = c.get("/api/v1/friends", headers=AUTH)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/friends", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sans_token(self, client):
        c, _ = client
        resp = c.get("/api/v1/friends")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/friends/requests
# ---------------------------------------------------------------------------

class TestSendFriendRequest:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,              # _get_current_user
            {"id": 2},             # utilisateur cible existe
            {"id": 10, "status": "pending"},  # INSERT RETURNING
        ]
        resp = c.post("/api/v1/friends/requests", json={"friend_user_id": 2}, headers=AUTH)
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"

    def test_soi_meme(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        resp = c.post("/api/v1/friends/requests", json={"friend_user_id": 1}, headers=AUTH)
        assert resp.status_code == 400
        assert "soi-meme" in resp.json()["detail"]

    def test_utilisateur_cible_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/friends/requests", json={"friend_user_id": 999}, headers=AUTH)
        assert resp.status_code == 404

    def test_sans_token(self, client):
        c, _ = client
        resp = c.post("/api/v1/friends/requests", json={"friend_user_id": 2})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/friends/requests/{id}/accept
# ---------------------------------------------------------------------------

class TestAcceptFriendRequest:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 10, "sender_user_id": 2, "receiver_user_id": 1, "status": "pending"},
        ]
        resp = c.post("/api/v1/friends/requests/10/accept", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"

    def test_demande_introuvable(self, client):
        c, cur = client
        cur.fetchone.side_effect = [USER_ROW, None]
        resp = c.post("/api/v1/friends/requests/99/accept", headers=AUTH)
        assert resp.status_code == 404

    def test_non_destinataire(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 10, "sender_user_id": 3, "receiver_user_id": 5, "status": "pending"},
        ]
        resp = c.post("/api/v1/friends/requests/10/accept", headers=AUTH)
        assert resp.status_code == 403

    def test_deja_traitee(self, client):
        c, cur = client
        cur.fetchone.side_effect = [
            USER_ROW,
            {"id": 10, "sender_user_id": 2, "receiver_user_id": 1, "status": "accepted"},
        ]
        resp = c.post("/api/v1/friends/requests/10/accept", headers=AUTH)
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/v1/friends/requests/{id}/reject
# ---------------------------------------------------------------------------

class TestRejectFriendRequest:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 1
        resp = c.post("/api/v1/friends/requests/10/reject", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_introuvable_ou_deja_traitee(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 0
        resp = c.post("/api/v1/friends/requests/10/reject", headers=AUTH)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/friends/requests/{id}
# ---------------------------------------------------------------------------

class TestCancelFriendRequest:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 1
        resp = c.delete("/api/v1/friends/requests/10", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_introuvable(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 0
        resp = c.delete("/api/v1/friends/requests/10", headers=AUTH)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/friends/{friend_id}
# ---------------------------------------------------------------------------

class TestRemoveFriend:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 2
        resp = c.delete("/api/v1/friends/2", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json()["status"] == "removed"

    def test_ami_introuvable(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.rowcount = 0
        resp = c.delete("/api/v1/friends/999", headers=AUTH)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/friends/requests/incoming
# ---------------------------------------------------------------------------

class TestIncomingRequests:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [REQUEST_ROW]
        resp = c.get("/api/v1/friends/requests/incoming", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["sender_pseudo"] == "bob"

    def test_liste_vide(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = []
        resp = c.get("/api/v1/friends/requests/incoming", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /api/v1/friends/requests/outgoing
# ---------------------------------------------------------------------------

class TestOutgoingRequests:
    def test_succes(self, client):
        c, cur = client
        cur.fetchone.return_value = USER_ROW
        cur.fetchall.return_value = [
            {
                "id": 10,
                "receiver_user_id": 2,
                "pseudo": "bob",
                "email": "bob@example.com",
                "status": "pending",
                "created_at": datetime(2024, 1, 1),
            }
        ]
        resp = c.get("/api/v1/friends/requests/outgoing", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["receiver_pseudo"] == "bob"
