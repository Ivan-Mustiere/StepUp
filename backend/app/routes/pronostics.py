from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

import app.core.database as _db
from app.core.security import _get_current_user

router = APIRouter(prefix="/api/v1/pronostics", tags=["pronostics"])


class PronosticCreate(BaseModel):
    titre: str
    prediction: str
    description: str | None = None
    cote: float | None = None


@router.get("")
def list_pronostics(
    statut: str | None = Query(None, description="Filtrer par statut : ouvert, termine, annule"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(_get_current_user),
):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            if statut:
                cur.execute(
                    """
                    SELECT p.id, p.titre, p.description, p.prediction, p.cote,
                           p.statut, p.created_at, u.pseudo AS auteur
                    FROM pronostics p
                    JOIN users u ON u.id = p.user_id
                    WHERE p.statut = %s
                    ORDER BY p.created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (statut, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT p.id, p.titre, p.description, p.prediction, p.cote,
                           p.statut, p.created_at, u.pseudo AS auteur
                    FROM pronostics p
                    JOIN users u ON u.id = p.user_id
                    ORDER BY p.created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset),
                )
            rows = cur.fetchall()
            return [dict(r) for r in rows]


@router.post("", status_code=201)
def create_pronostic(payload: PronosticCreate, current_user=Depends(_get_current_user)):
    with _db.get_db() as conn:
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
