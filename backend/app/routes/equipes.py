from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/equipes", tags=["equipes"])


class SetEquipesRequest(BaseModel):
    equipe_ids: list[int]


@router.get("")
def list_equipes(
    jeu: str | None = None,
    current_user=Depends(_get_current_user),
):
    """Retourne toutes les équipes, optionnellement filtrées par jeu."""
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            if jeu:
                cur.execute(
                    "SELECT id, nom, jeu, logo_url, couleur FROM equipes_esport WHERE jeu = %s ORDER BY nom",
                    (jeu,),
                )
            else:
                cur.execute(
                    "SELECT id, nom, jeu, logo_url, couleur FROM equipes_esport ORDER BY jeu, nom"
                )
            return [dict(r) for r in cur.fetchall()]


@router.get("/me")
def get_my_equipes(current_user=Depends(_get_current_user)):
    """Retourne les équipes de l'utilisateur connecté."""
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.id, e.nom, e.jeu, e.logo_url, e.couleur
                FROM equipes_esport e
                JOIN user_equipes_esport ue ON ue.equipe_id = e.id
                WHERE ue.user_id = %s
                ORDER BY e.jeu, e.nom
                """,
                (current_user["id"],),
            )
            return [dict(r) for r in cur.fetchall()]


@router.put("/me")
def set_my_equipes(payload: SetEquipesRequest, current_user=Depends(_get_current_user)):
    """Remplace les équipes de l'utilisateur (max 3)."""
    if len(payload.equipe_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 équipes.")

    with _db.get_db() as conn:
        with conn.cursor() as cur:
            # Vérifier que tous les IDs existent
            if payload.equipe_ids:
                cur.execute(
                    "SELECT id FROM equipes_esport WHERE id = ANY(%s)",
                    (payload.equipe_ids,),
                )
                found = {r["id"] for r in cur.fetchall()}
                missing = set(payload.equipe_ids) - found
                if missing:
                    raise HTTPException(status_code=404, detail="Équipe(s) introuvable(s).")

            # Remplacer
            cur.execute(
                "DELETE FROM user_equipes_esport WHERE user_id = %s",
                (current_user["id"],),
            )
            for equipe_id in payload.equipe_ids:
                cur.execute(
                    "INSERT INTO user_equipes_esport (user_id, equipe_id) VALUES (%s, %s)",
                    (current_user["id"], equipe_id),
                )
            conn.commit()

            cur.execute(
                """
                SELECT e.id, e.nom, e.jeu, e.logo_url, e.couleur
                FROM equipes_esport e
                JOIN user_equipes_esport ue ON ue.equipe_id = e.id
                WHERE ue.user_id = %s
                ORDER BY e.jeu, e.nom
                """,
                (current_user["id"],),
            )
            return [dict(r) for r in cur.fetchall()]
