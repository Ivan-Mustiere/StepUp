import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/paris", tags=["paris"])


class MiseCreate(BaseModel):
    mise: int


@router.get("")
def list_paris(
    statut: str | None = Query(None, description="actif, ferme, regle"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(_get_current_user),
):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            if statut:
                cur.execute(
                    """
                    SELECT pa.id, pa.description, pa.mise_min, pa.statut, pa.created_at,
                           p.titre, p.prediction, p.cote, u.pseudo AS auteur
                    FROM paris pa
                    JOIN pronostics p ON p.id = pa.pronostic_id
                    JOIN users u ON u.id = pa.admin_user_id
                    WHERE pa.statut = %s
                    ORDER BY pa.created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (statut, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT pa.id, pa.description, pa.mise_min, pa.statut, pa.created_at,
                           p.titre, p.prediction, p.cote, u.pseudo AS auteur
                    FROM paris pa
                    JOIN pronostics p ON p.id = pa.pronostic_id
                    JOIN users u ON u.id = pa.admin_user_id
                    ORDER BY pa.created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset),
                )
            rows = cur.fetchall()
            return [dict(r) for r in rows]


@router.post("/{pari_id}/miser", status_code=201)
def place_bet(pari_id: int, payload: MiseCreate, current_user=Depends(_get_current_user)):
    if payload.mise <= 0:
        raise HTTPException(status_code=400, detail="La mise doit être supérieure à 0.")

    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, mise_min, statut FROM paris WHERE id = %s", (pari_id,))
            pari = cur.fetchone()
            if not pari:
                raise HTTPException(status_code=404, detail="Pari introuvable.")
            if pari["statut"] != "actif":
                raise HTTPException(status_code=400, detail="Ce pari n'est plus actif.")
            if payload.mise < pari["mise_min"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"La mise minimum est de {pari['mise_min']} coins.",
                )

            cur.execute(
                "SELECT coins FROM users WHERE id = %s FOR UPDATE",
                (current_user["id"],),
            )
            user = cur.fetchone()
            if user["coins"] < payload.mise:
                raise HTTPException(status_code=400, detail="Coins insuffisants.")

            cur.execute(
                "UPDATE users SET coins = coins - %s WHERE id = %s",
                (payload.mise, current_user["id"]),
            )
            cur.execute(
                """
                INSERT INTO user_historique_parie (user_id, paris_detail)
                VALUES (%s, %s)
                RETURNING id
                """,
                (
                    current_user["id"],
                    json.dumps({"pari_id": pari_id, "mise": payload.mise}),
                ),
            )
            record = cur.fetchone()
            conn.commit()

            cur.execute("SELECT coins FROM users WHERE id = %s", (current_user["id"],))
            updated = cur.fetchone()

            return {
                "historique_id": record["id"],
                "mise": payload.mise,
                "coins_restants": updated["coins"],
            }
