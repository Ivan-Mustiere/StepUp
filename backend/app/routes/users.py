from fastapi import APIRouter, Depends, HTTPException

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/{user_id}")
def get_user_profile(user_id: int, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.pseudo, u.avatar, u.coins, u.xp_total, u.vip, u.date_creation,
                       ARRAY_REMOVE(ARRAY_AGG(c.nom ORDER BY c.nom), NULL) AS communautes
                FROM users u
                LEFT JOIN user_communautes uc ON uc.user_id = u.id
                LEFT JOIN communautes c ON c.id = uc.communaute_id
                WHERE u.id = %s
                GROUP BY u.id, u.pseudo, u.avatar, u.coins, u.xp_total, u.vip, u.date_creation
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
            return dict(row)
