import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/paris", tags=["paris"])


class MiseCreate(BaseModel):
    mise: int
    equipe_choisie: str | None = None


@router.get("")
async def list_paris(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(_get_current_user),
):
    """
    Retourne les paris :
    - actifs en premier, triés par date de match (date_debut ASC, puis created_at ASC)
    - paris terminés/fermés uniquement si l'utilisateur y a parié
    """
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT pa.id, pa.description, pa.mise_min, pa.statut, pa.created_at,
                       pa.date_debut, p.titre, p.prediction, p.cote,
                       p.cote_team1, p.cote_team2, p.categorie, u.pseudo AS auteur,
                       EXISTS (
                           SELECT 1 FROM user_paris_actifs upa
                           WHERE upa.pari_id = pa.id AND upa.user_id = %s
                       ) AS deja_parie,
                       (
                           SELECT upa.mise FROM user_paris_actifs upa
                           WHERE upa.pari_id = pa.id AND upa.user_id = %s
                       ) AS ma_mise,
                       (
                           SELECT upa.equipe_choisie FROM user_paris_actifs upa
                           WHERE upa.pari_id = pa.id AND upa.user_id = %s
                       ) AS mon_equipe
                FROM paris pa
                JOIN pronostics p ON p.id = pa.pronostic_id
                JOIN users u ON u.id = pa.admin_user_id
                WHERE (
                    pa.statut = 'actif'
                    AND (pa.date_debut IS NULL OR pa.date_debut > NOW())
                )
                OR EXISTS (
                    SELECT 1 FROM user_paris_actifs upa
                    WHERE upa.pari_id = pa.id AND upa.user_id = %s
                )
                ORDER BY
                    CASE WHEN pa.statut = 'actif' THEN 0 ELSE 1 END,
                    pa.date_debut ASC NULLS LAST,
                    pa.created_at ASC
                LIMIT %s OFFSET %s
                """,
                (current_user["id"], current_user["id"], current_user["id"], current_user["id"], limit, offset),
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


@router.post("/{pari_id}/miser", status_code=201)
async def place_bet(pari_id: int, payload: MiseCreate, current_user=Depends(_get_current_user)):
    if payload.mise <= 0:
        raise HTTPException(status_code=400, detail="La mise doit être supérieure à 0.")

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT pa.id, pa.mise_min, pa.statut, pa.date_debut,
                       p.cote_team1, p.cote_team2, p.titre
                FROM paris pa
                JOIN pronostics p ON p.id = pa.pronostic_id
                WHERE pa.id = %s
                """,
                (pari_id,),
            )
            pari = await cur.fetchone()
            if not pari:
                raise HTTPException(status_code=404, detail="Pari introuvable.")
            if pari["statut"] != "actif":
                raise HTTPException(status_code=400, detail="Ce pari n'est plus actif.")
            if pari["date_debut"]:
                cutoff = pari["date_debut"] - timedelta(minutes=15)
                if datetime.now() >= cutoff:
                    raise HTTPException(
                        status_code=400,
                        detail="Les paris sont fermés (moins de 15 min avant le début).",
                    )
            if payload.mise < pari["mise_min"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"La mise minimum est de {pari['mise_min']} coins.",
                )

            await cur.execute(
                "SELECT coins, coins_en_jeu, gems FROM users WHERE id = %s FOR UPDATE",
                (current_user["id"],),
            )
            user = await cur.fetchone()

            if user["gems"] < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Il vous faut au moins 1 💎 Gem pour parier. Marchez pour en gagner !",
                )
            if user["coins"] < payload.mise:
                raise HTTPException(status_code=400, detail="Coins insuffisants.")

            await cur.execute(
                "SELECT 1 FROM user_paris_actifs WHERE user_id = %s AND pari_id = %s",
                (current_user["id"], pari_id),
            )
            if await cur.fetchone():
                raise HTTPException(status_code=409, detail="Vous avez déjà parié sur ce match.")

            # Figer la cote au moment du pari
            cote_appliquee = None
            if payload.equipe_choisie and pari["cote_team1"] and pari["cote_team2"]:
                import re as _re
                titre = pari["titre"] or ""
                match_part = _re.split(r"\s*[—–-]+\s*", titre)[0]
                vs_parts = _re.split(r"\s+vs\.?\s+", match_part, flags=_re.IGNORECASE)
                team1_raw = vs_parts[0].strip().lower() if len(vs_parts) >= 2 else ""
                if payload.equipe_choisie.strip().lower() == team1_raw:
                    cote_appliquee = float(pari["cote_team1"])
                else:
                    cote_appliquee = float(pari["cote_team2"])

            xp_gagne = 10 + min(payload.mise // 50, 40)
            await cur.execute(
                """
                UPDATE users
                SET coins = coins - %s,
                    coins_en_jeu = coins_en_jeu + %s,
                    gems = gems - 1,
                    xp_total = xp_total + %s,
                    xp_semaine = xp_semaine + %s
                WHERE id = %s
                """,
                (payload.mise, payload.mise, xp_gagne, xp_gagne, current_user["id"]),
            )

            await cur.execute(
                """
                INSERT INTO user_paris_actifs (user_id, pari_id, mise, equipe_choisie, cote_appliquee)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (current_user["id"], pari_id, payload.mise, payload.equipe_choisie, cote_appliquee),
            )

            await cur.execute(
                """
                INSERT INTO user_historique_parie (user_id, paris_detail)
                VALUES (%s, %s)
                """,
                (
                    current_user["id"],
                    json.dumps({"pari_id": pari_id, "mise": payload.mise, "equipe_choisie": payload.equipe_choisie, "cote_appliquee": cote_appliquee, "statut": "en_cours"}),
                ),
            )

            await conn.commit()

            await cur.execute(
                "SELECT coins, coins_en_jeu, gems FROM users WHERE id = %s",
                (current_user["id"],),
            )
            updated = await cur.fetchone()

            return {
                "mise": payload.mise,
                "coins_restants": updated["coins"],
                "coins_en_jeu": updated["coins_en_jeu"],
                "gems_restants": updated["gems"],
            }
