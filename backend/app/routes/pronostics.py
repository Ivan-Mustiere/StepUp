from fastapi import APIRouter, Depends
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/pronostics", tags=["pronostics"])


class PronosticCreate(BaseModel):
    titre: str
    prediction: str
    description: str | None = None
    cote: float | None = None


@router.post("", status_code=201)
def create_pronostic(payload: PronosticCreate, current_user=Depends(_get_current_user)):
    conn = _db._connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pronostics (user_id, titre, description, prediction, cote)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, statut, created_at
                """,
                (
                    current_user["id"],
                    payload.titre,
                    payload.description,
                    payload.prediction,
                    payload.cote,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {"pronostic_id": row["id"], "statut": row["statut"], "created_at": row["created_at"]}
    finally:
        conn.close()
