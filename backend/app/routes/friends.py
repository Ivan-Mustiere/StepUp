from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/friends", tags=["friends"])


class FriendRequestCreate(BaseModel):
    friend_user_id: int


@router.get("")
def list_friends(current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.pseudo, u.avatar, u.coins, u.xp_total, u.vip,
                       ARRAY_REMOVE(ARRAY_AGG(c.nom ORDER BY c.nom), NULL) AS communautes
                FROM user_friends f
                JOIN users u ON u.id = f.friend_user_id
                LEFT JOIN user_communautes uc ON uc.user_id = u.id
                LEFT JOIN communautes c ON c.id = uc.communaute_id
                WHERE f.user_id = %s
                GROUP BY u.id, u.pseudo, u.avatar, u.coins, u.xp_total, u.vip
                ORDER BY u.pseudo
                """,
                (current_user["id"],),
            )
            rows = cur.fetchall()
            return [dict(r) for r in rows]


@router.post("/requests", status_code=201)
def send_friend_request(payload: FriendRequestCreate, current_user=Depends(_get_current_user)):
    if payload.friend_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Impossible de s'ajouter soi-meme.")

    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE id = %s", (payload.friend_user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Utilisateur cible introuvable.")

            cur.execute(
                """
                INSERT INTO user_friend_requests (sender_user_id, receiver_user_id)
                VALUES (%s, %s)
                ON CONFLICT (sender_user_id, receiver_user_id) DO UPDATE
                SET status = 'pending', created_at = CURRENT_TIMESTAMP
                RETURNING id, status
                """,
                (current_user["id"], payload.friend_user_id),
            )
            req = cur.fetchone()
            conn.commit()
            return {"request_id": req["id"], "status": req["status"]}


@router.post("/requests/{request_id}/accept")
def accept_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, sender_user_id, receiver_user_id, status
                FROM user_friend_requests
                WHERE id = %s
                """,
                (request_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Demande introuvable.")
            if row["receiver_user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Cette demande ne vous appartient pas.")
            if row["status"] != "pending":
                raise HTTPException(status_code=400, detail="Demande deja traitee.")

            cur.execute(
                "UPDATE user_friend_requests SET status = 'accepted' WHERE id = %s",
                (request_id,),
            )
            cur.execute(
                """
                INSERT INTO user_friends (user_id, friend_user_id)
                VALUES (%s, %s), (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (row["sender_user_id"], row["receiver_user_id"], row["receiver_user_id"], row["sender_user_id"]),
            )
            conn.commit()
            return {"status": "accepted"}


@router.post("/requests/{request_id}/reject")
def reject_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_friend_requests
                SET status = 'rejected'
                WHERE id = %s AND receiver_user_id = %s AND status = 'pending'
                """,
                (request_id, current_user["id"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Demande introuvable, deja traitee, ou non autorisee.",
                )
            conn.commit()
            return {"status": "rejected"}


@router.delete("/requests/{request_id}")
def cancel_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_friend_requests
                WHERE id = %s AND sender_user_id = %s AND status = 'pending'
                """,
                (request_id, current_user["id"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Demande introuvable, deja traitee, ou non autorisee.",
                )
            conn.commit()
            return {"status": "cancelled"}


@router.get("/requests/incoming")
def list_incoming_friend_requests(current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.sender_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.sender_user_id
                WHERE r.receiver_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user["id"],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r["id"],
                    "sender_user_id": r["sender_user_id"],
                    "sender_pseudo": r["pseudo"],
                    "sender_email": r["email"],
                    "status": r["status"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]


@router.get("/requests/outgoing")
def list_outgoing_friend_requests(current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.receiver_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.receiver_user_id
                WHERE r.sender_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user["id"],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r["id"],
                    "receiver_user_id": r["receiver_user_id"],
                    "receiver_pseudo": r["pseudo"],
                    "receiver_email": r["email"],
                    "status": r["status"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]
