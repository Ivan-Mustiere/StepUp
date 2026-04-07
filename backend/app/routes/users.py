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
                SELECT id, pseudo, avatar, coins, xp_total, vip, date_creation
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
            return dict(row)
