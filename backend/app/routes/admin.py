import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user, _require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class BetCreate(BaseModel):
    pronostic_id: int
    description: str | None = None
    mise_min: int = 0


@router.post("/paris", status_code=201)
async def create_bet_admin(payload: BetCreate, current_user=Depends(_get_current_user)):
    _require_admin(current_user)
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT 1 FROM pronostics WHERE id = %s", (payload.pronostic_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Pronostic introuvable.")

            await cur.execute(
                """
                INSERT INTO paris (admin_user_id, pronostic_id, description, mise_min)
                VALUES (%s, %s, %s, %s)
                RETURNING id, statut, created_at
                """,
                (
                    current_user["id"],
                    payload.pronostic_id,
                    payload.description,
                    payload.mise_min,
                ),
            )
            row = await cur.fetchone()
            await conn.commit()
            return {"pari_id": row["id"], "statut": row["statut"], "created_at": row["created_at"]}


class ReglerCreate(BaseModel):
    equipe_gagnante: str


@router.post("/paris/{pari_id}/regler", status_code=200)
async def regler_pari(pari_id: int, payload: ReglerCreate, current_user=Depends(_get_current_user)):
    """
    Résout un pari : crédite les gagnants (mise × cote_appliquee),
    libère coins_en_jeu pour tout le monde, passe le pari en 'regle'.
    """
    _require_admin(current_user)
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, statut FROM paris WHERE id = %s FOR UPDATE",
                (pari_id,),
            )
            pari = await cur.fetchone()
            if not pari:
                raise HTTPException(status_code=404, detail="Pari introuvable.")
            if pari["statut"] == "regle":
                raise HTTPException(status_code=409, detail="Ce pari est déjà réglé.")

            # Récupérer tous les parieurs
            await cur.execute(
                """
                SELECT user_id, mise, equipe_choisie, cote_appliquee
                FROM user_paris_actifs
                WHERE pari_id = %s
                """,
                (pari_id,),
            )
            parieurs = await cur.fetchall()

            gagnants = 0
            perdants = 0
            total_redistribue = 0

            for p in parieurs:
                est_gagnant = (
                    p["equipe_choisie"] is not None and
                    p["equipe_choisie"].strip().lower() == payload.equipe_gagnante.strip().lower()
                )
                cote = float(p["cote_appliquee"]) if p["cote_appliquee"] else 1.0
                gain = int(p["mise"] * cote) if est_gagnant else 0

                if est_gagnant:
                    # Créditer le gain et libérer coins_en_jeu
                    await cur.execute(
                        """
                        UPDATE users
                        SET coins = coins + %s,
                            coins_en_jeu = GREATEST(0, coins_en_jeu - %s),
                            xp_total = xp_total + %s,
                            xp_semaine = xp_semaine + %s
                        WHERE id = %s
                        """,
                        (gain, p["mise"], 20, 20, p["user_id"]),
                    )
                    gagnants += 1
                    total_redistribue += gain
                else:
                    # Libérer coins_en_jeu sans créditer
                    await cur.execute(
                        "UPDATE users SET coins_en_jeu = GREATEST(0, coins_en_jeu - %s) WHERE id = %s",
                        (p["mise"], p["user_id"]),
                    )
                    perdants += 1

                # Mettre à jour l'historique
                await cur.execute(
                    """
                    INSERT INTO user_historique_parie (user_id, paris_detail)
                    VALUES (%s, %s)
                    """,
                    (
                        p["user_id"],
                        json.dumps({
                            "pari_id": pari_id,
                            "mise": p["mise"],
                            "equipe_choisie": p["equipe_choisie"],
                            "equipe_gagnante": payload.equipe_gagnante,
                            "gain": gain,
                            "statut": "gagne" if est_gagnant else "perdu",
                        }),
                    ),
                )

            # Marquer le pari comme réglé
            await cur.execute(
                "UPDATE paris SET statut = 'regle' WHERE id = %s",
                (pari_id,),
            )
            await conn.commit()

            return {
                "pari_id": pari_id,
                "equipe_gagnante": payload.equipe_gagnante,
                "gagnants": gagnants,
                "perdants": perdants,
                "total_redistribue": total_redistribue,
            }
