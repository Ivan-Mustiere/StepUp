from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/equipes", tags=["equipes"])


class SetEquipesRequest(BaseModel):
    equipe_ids: list[int]


@router.get("")
async def list_equipes(current_user=Depends(_get_current_user)):
    """Retourne toutes les équipes."""
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, nom, logo_url, couleur FROM equipes_esport ORDER BY nom"
            )
            return [dict(r) for r in await cur.fetchall()]


@router.get("/me")
async def get_my_equipes(current_user=Depends(_get_current_user)):
    """Retourne les équipes de l'utilisateur connecté."""
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.id, e.nom, e.logo_url, e.couleur
                FROM equipes_esport e
                JOIN user_equipes_esport ue ON ue.equipe_id = e.id
                WHERE ue.user_id = %s
                ORDER BY e.nom
                """,
                (current_user["id"],),
            )
            return [dict(r) for r in await cur.fetchall()]


@router.put("/me")
async def set_my_equipes(payload: SetEquipesRequest, current_user=Depends(_get_current_user)):
    """Remplace les équipes de l'utilisateur (max 3)."""
    if len(payload.equipe_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 équipes.")

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            if payload.equipe_ids:
                await cur.execute(
                    "SELECT id FROM equipes_esport WHERE id = ANY(%s)",
                    (payload.equipe_ids,),
                )
                found = {r["id"] for r in await cur.fetchall()}
                missing = set(payload.equipe_ids) - found
                if missing:
                    raise HTTPException(status_code=404, detail="Équipe(s) introuvable(s).")

            await cur.execute(
                "DELETE FROM user_equipes_esport WHERE user_id = %s",
                (current_user["id"],),
            )
            for equipe_id in payload.equipe_ids:
                await cur.execute(
                    "INSERT INTO user_equipes_esport (user_id, equipe_id) VALUES (%s, %s)",
                    (current_user["id"], equipe_id),
                )
            await conn.commit()

            await cur.execute(
                """
                SELECT e.id, e.nom, e.logo_url, e.couleur
                FROM equipes_esport e
                JOIN user_equipes_esport ue ON ue.equipe_id = e.id
                WHERE ue.user_id = %s
                ORDER BY e.nom
                """,
                (current_user["id"],),
            )
            return [dict(r) for r in await cur.fetchall()]
