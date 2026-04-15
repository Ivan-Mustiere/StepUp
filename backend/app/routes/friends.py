from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/friends", tags=["friends"])


class FriendRequestCreate(BaseModel):
    friend_user_id: int


@router.get("/search")
async def search_by_friend_code(code: str = Query(...), current_user=Depends(_get_current_user)):
    """Recherche un utilisateur par son code ami."""
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, pseudo, avatar, xp_total, coins FROM users WHERE friend_code = %s",
                (code.strip().lower(),),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Code ami introuvable.")
            if row["id"] == current_user["id"]:
                raise HTTPException(status_code=400, detail="C'est votre propre code ami.")
            return dict(row)


@router.get("")
async def list_friends(current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
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
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


@router.post("/requests", status_code=201)
async def send_friend_request(payload: FriendRequestCreate, current_user=Depends(_get_current_user)):
    if payload.friend_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Impossible de s'ajouter soi-meme.")

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT 1 FROM users WHERE id = %s", (payload.friend_user_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Utilisateur cible introuvable.")

            await cur.execute(
                """
                INSERT INTO user_friend_requests (sender_user_id, receiver_user_id)
                VALUES (%s, %s)
                ON CONFLICT (sender_user_id, receiver_user_id) DO UPDATE
                SET status = 'pending', created_at = CURRENT_TIMESTAMP
                RETURNING id, status
                """,
                (current_user["id"], payload.friend_user_id),
            )
            req = await cur.fetchone()
            await conn.commit()
            return {"request_id": req["id"], "status": req["status"]}


@router.post("/requests/{request_id}/accept")
async def accept_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, sender_user_id, receiver_user_id, status
                FROM user_friend_requests
                WHERE id = %s
                """,
                (request_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Demande introuvable.")
            if row["receiver_user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Cette demande ne vous appartient pas.")
            if row["status"] != "pending":
                raise HTTPException(status_code=400, detail="Demande deja traitee.")

            await cur.execute(
                "UPDATE user_friend_requests SET status = 'accepted' WHERE id = %s",
                (request_id,),
            )
            await cur.execute(
                """
                INSERT INTO user_friends (user_id, friend_user_id)
                VALUES (%s, %s), (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (row["sender_user_id"], row["receiver_user_id"], row["receiver_user_id"], row["sender_user_id"]),
            )
            await conn.commit()
            return {"status": "accepted"}


@router.post("/requests/{request_id}/reject")
async def reject_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
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
            await conn.commit()
            return {"status": "rejected"}


@router.delete("/requests/{request_id}")
async def cancel_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
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
            await conn.commit()
            return {"status": "cancelled"}


@router.delete("/{friend_id}")
async def remove_friend(friend_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                DELETE FROM user_friends
                WHERE (user_id = %s AND friend_user_id = %s)
                   OR (user_id = %s AND friend_user_id = %s)
                """,
                (current_user["id"], friend_id, friend_id, current_user["id"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Ami introuvable.")
            await conn.commit()
            return {"status": "removed"}


@router.get("/requests/incoming")
async def list_incoming_friend_requests(current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT r.id, r.sender_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.sender_user_id
                WHERE r.receiver_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user["id"],),
            )
            rows = await cur.fetchall()
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
async def list_outgoing_friend_requests(current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT r.id, r.receiver_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.receiver_user_id
                WHERE r.sender_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user["id"],),
            )
            rows = await cur.fetchall()
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
