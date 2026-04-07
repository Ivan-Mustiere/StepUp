from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/communautes", tags=["communautes"])


class CommunityJoinRequest(BaseModel):
    communaute_id: int


@router.post("/rejoindre", status_code=201)
def request_join_community(payload: CommunityJoinRequest, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_community_requests (user_id, communaute_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, communaute_id) DO UPDATE
                SET status = 'pending', created_at = CURRENT_TIMESTAMP
                RETURNING id, status
                """,
                (current_user["id"], payload.communaute_id),
            )
            req = cur.fetchone()
            conn.commit()
            return {"request_id": req["id"], "status": req["status"]}


@router.get("/requests/me")
def list_my_community_requests(current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, communaute_id, status, created_at
                FROM user_community_requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (current_user["id"],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r["id"],
                    "communaute_id": r["communaute_id"],
                    "status": r["status"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]


@router.delete("/requests/{request_id}")
def cancel_community_request(request_id: int, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_community_requests
                WHERE id = %s AND user_id = %s AND status = 'pending'
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
