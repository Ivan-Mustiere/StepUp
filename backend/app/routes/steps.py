from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/steps", tags=["steps"])

GEMS_PAR_1000_PAS = 1
MAX_GEMS_PAR_JOUR = 20


class StepsSync(BaseModel):
    pas: int


@router.post("")
def sync_steps(payload: StepsSync, current_user=Depends(_get_current_user)):
    if payload.pas < 0:
        raise HTTPException(status_code=400, detail="Nombre de pas invalide.")

    today = date.today()

    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pas, gems_awarded FROM user_pas_history WHERE user_id = %s AND date = %s",
                (current_user["id"], today),
            )
            existing = cur.fetchone()
            old_pas = existing["pas"] if existing else 0
            gems_deja_accordes = existing["gems_awarded"] if existing else 0

            new_pas = max(old_pas, payload.pas)
            delta_pas = new_pas - old_pas

            cur.execute(
                """
                INSERT INTO user_pas_history (user_id, date, pas, gems_awarded)
                VALUES (%s, %s, %s, 0)
                ON CONFLICT (user_id, date) DO UPDATE
                SET pas = GREATEST(user_pas_history.pas, EXCLUDED.pas)
                """,
                (current_user["id"], today, new_pas),
            )

            gems_merités = min(new_pas // 1000, MAX_GEMS_PAR_JOUR)
            nouveaux_gems = max(0, gems_merités - gems_deja_accordes)

            if nouveaux_gems > 0:
                cur.execute(
                    "UPDATE user_pas_history SET gems_awarded = %s WHERE user_id = %s AND date = %s",
                    (gems_merités, current_user["id"], today),
                )
                cur.execute(
                    "UPDATE users SET gems = gems + %s WHERE id = %s",
                    (nouveaux_gems, current_user["id"]),
                )

            if delta_pas > 0:
                cur.execute(
                    "UPDATE users SET pas_total = pas_total + %s WHERE id = %s",
                    (delta_pas, current_user["id"]),
                )

            conn.commit()

            cur.execute("SELECT gems FROM users WHERE id = %s", (current_user["id"],))
            user = cur.fetchone()

            reste = new_pas % 1000
            prochain_dans = (1000 - reste) if reste != 0 else 1000

            return {
                "pas_aujourd_hui": new_pas,
                "gems_gagnes_aujourd_hui": gems_merités,
                "nouveaux_gems": nouveaux_gems,
                "total_gems": user["gems"],
                "prochain_gem_dans": prochain_dans,
            }


@router.get("/today")
def get_today_steps(current_user=Depends(_get_current_user)):
    today = date.today()
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pas, gems_awarded FROM user_pas_history WHERE user_id = %s AND date = %s",
                (current_user["id"], today),
            )
            row = cur.fetchone()
            pas_today = row["pas"] if row else 0
            gems_today = row["gems_awarded"] if row else 0

            cur.execute("SELECT gems FROM users WHERE id = %s", (current_user["id"],))
            user = cur.fetchone()

            reste = pas_today % 1000
            prochain_dans = (1000 - reste) if reste != 0 else 1000

            return {
                "pas_aujourd_hui": pas_today,
                "gems_gagnes_aujourd_hui": gems_today,
                "total_gems": user["gems"],
                "prochain_gem_dans": prochain_dans,
            }
