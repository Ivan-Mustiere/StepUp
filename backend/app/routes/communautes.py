from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/communautes", tags=["communautes"])


class MessageCreate(BaseModel):
    contenu: str


@router.get("")
async def list_communautes(current_user=Depends(_get_current_user)):
    """Liste toutes les communautés avec le nombre de membres et le statut de l'utilisateur."""
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    c.id, c.nom, c.description, c.jeu, c.created_at,
                    COUNT(uc.user_id) AS nb_membres,
                    BOOL_OR(uc.user_id = %s) AS est_membre
                FROM communautes c
                LEFT JOIN user_communautes uc ON uc.communaute_id = c.id
                GROUP BY c.id
                ORDER BY c.jeu, c.nom
                """,
                (current_user["id"],),
            )
            return [dict(r) for r in await cur.fetchall()]


@router.post("/{communaute_id}/rejoindre", status_code=201)
async def join_community(communaute_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM communautes WHERE id = %s", (communaute_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Communauté introuvable.")

            await cur.execute(
                """
                INSERT INTO user_communautes (user_id, communaute_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, communaute_id) DO NOTHING
                """,
                (current_user["id"], communaute_id),
            )
            await conn.commit()
            return {"status": "membre"}


@router.delete("/{communaute_id}/quitter")
async def leave_community(communaute_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                DELETE FROM user_communautes
                WHERE user_id = %s AND communaute_id = %s
                """,
                (current_user["id"], communaute_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Vous n'êtes pas membre de cette communauté.")
            await conn.commit()
            return {"status": "quitte"}


@router.get("/{communaute_id}/classement")
async def get_classement(
    communaute_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(_get_current_user),
):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM communautes WHERE id = %s", (communaute_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Communauté introuvable.")
            await cur.execute(
                """
                SELECT u.id, u.pseudo, u.xp_total, u.coins, u.vip,
                       ROW_NUMBER() OVER (ORDER BY u.xp_total DESC) AS rang
                FROM user_communautes uc
                JOIN users u ON u.id = uc.user_id
                WHERE uc.communaute_id = %s
                ORDER BY u.xp_total DESC
                LIMIT %s
                """,
                (communaute_id, limit),
            )
            return [dict(r) for r in await cur.fetchall()]


@router.get("/{communaute_id}/messages")
async def get_messages(
    communaute_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: int | None = Query(None, description="Charger les messages avant cet id"),
    current_user=Depends(_get_current_user),
):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT 1 FROM user_communautes WHERE user_id = %s AND communaute_id = %s",
                (current_user["id"], communaute_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Vous devez être membre pour lire le chat.")

            if before_id:
                await cur.execute(
                    """
                    SELECT m.id, m.user_id, m.contenu, m.created_at, u.pseudo
                    FROM communaute_messages m
                    JOIN users u ON u.id = m.user_id
                    WHERE m.communaute_id = %s AND m.id < %s
                    ORDER BY m.created_at DESC
                    LIMIT %s
                    """,
                    (communaute_id, before_id, limit),
                )
            else:
                await cur.execute(
                    """
                    SELECT m.id, m.user_id, m.contenu, m.created_at, u.pseudo
                    FROM communaute_messages m
                    JOIN users u ON u.id = m.user_id
                    WHERE m.communaute_id = %s
                    ORDER BY m.created_at DESC
                    LIMIT %s
                    """,
                    (communaute_id, limit),
                )
            rows = await cur.fetchall()
            return list(reversed([dict(r) for r in rows]))


@router.post("/{communaute_id}/messages", status_code=201)
async def send_message(communaute_id: int, payload: MessageCreate, current_user=Depends(_get_current_user)):
    contenu = payload.contenu.strip()
    if not contenu:
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")
    if len(contenu) > 500:
        raise HTTPException(status_code=400, detail="Message trop long (max 500 caractères).")

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT 1 FROM user_communautes WHERE user_id = %s AND communaute_id = %s",
                (current_user["id"], communaute_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Vous devez être membre pour envoyer un message.")

            await cur.execute(
                """
                INSERT INTO communaute_messages (communaute_id, user_id, contenu)
                VALUES (%s, %s, %s)
                RETURNING id, created_at
                """,
                (communaute_id, current_user["id"], contenu),
            )
            row = await cur.fetchone()
            await conn.commit()
            return {
                "id": row["id"],
                "contenu": contenu,
                "created_at": row["created_at"],
                "pseudo": current_user["pseudo"],
            }
