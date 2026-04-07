from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/messages", tags=["messages"])


class MessageCreate(BaseModel):
    contenu: str


@router.get("/{friend_id}")
def get_conversation(
    friend_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(_get_current_user),
):
    """Récupère la conversation privée avec un ami."""
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM user_friends WHERE user_id = %s AND friend_user_id = %s",
                (current_user["id"], friend_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Vous devez être ami pour accéder à cette conversation.")

            cur.execute(
                """
                SELECT id, sender_id, receiver_id, contenu, created_at,
                       (sender_id = %s) AS is_mine
                FROM messages_prives
                WHERE (sender_id = %s AND receiver_id = %s)
                   OR (sender_id = %s AND receiver_id = %s)
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (
                    current_user["id"],
                    current_user["id"], friend_id,
                    friend_id, current_user["id"],
                    limit,
                ),
            )
            rows = cur.fetchall()
            return list(reversed([dict(r) for r in rows]))


@router.post("/{friend_id}", status_code=201)
def send_private_message(
    friend_id: int,
    payload: MessageCreate,
    current_user=Depends(_get_current_user),
):
    contenu = payload.contenu.strip()
    if not contenu:
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")
    if len(contenu) > 1000:
        raise HTTPException(status_code=400, detail="Message trop long (max 1000 caractères).")

    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM user_friends WHERE user_id = %s AND friend_user_id = %s",
                (current_user["id"], friend_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Vous devez être ami pour envoyer un message.")

            cur.execute(
                """
                INSERT INTO messages_prives (sender_id, receiver_id, contenu)
                VALUES (%s, %s, %s)
                RETURNING id, created_at
                """,
                (current_user["id"], friend_id, contenu),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                "id": row["id"],
                "sender_id": current_user["id"],
                "receiver_id": friend_id,
                "contenu": contenu,
                "created_at": row["created_at"],
                "is_mine": True,
            }
