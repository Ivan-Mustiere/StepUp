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
