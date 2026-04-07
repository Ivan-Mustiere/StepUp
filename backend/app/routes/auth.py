import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

import app.core.database as _db
from app.core.security import (
    _create_access_token,
    _get_current_user,
    _hash_password,
    _verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class RegisterRequest(BaseModel):
    pseudo: str
    age: int | None = None
    genre: str | None = None
    region: str | None = None
    pays: str | None = None
    email: str
    password: str
    avatar: str | None = None
    league_regarde: str | None = None

    @field_validator("pseudo")
    @classmethod
    def validate_pseudo(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Le pseudo doit contenir au moins 3 caracteres.")
        return value

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: int | None) -> int | None:
        if value is not None and value < 16:
            raise ValueError("Age minimum : 16 ans.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Email invalide.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Mot de passe trop court (8 caracteres min).")
        rules = [
            re.search(r"[A-Z]", value),
            re.search(r"[a-z]", value),
            re.search(r"[0-9]", value),
            re.search(r"[^A-Za-z0-9]", value),
        ]
        if not all(rules):
            raise ValueError(
                "Le mot de passe doit contenir majuscule, minuscule, chiffre et caractere special."
            )
        return value


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    pseudo: str
    email: str
    coins: int
    xp_total: int
    vip: bool
    date_creation: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
def register(request: Request, payload: RegisterRequest):
    hashed_password = _hash_password(payload.password)
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE email = %s", (payload.email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email deja utilise.")

            cur.execute("SELECT 1 FROM users WHERE pseudo = %s", (payload.pseudo,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Pseudo deja utilise.")

            cur.execute(
                """
                INSERT INTO users (
                    pseudo, age, genre, region, pays, email, password_hash,
                    avatar, league_regarde
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, pseudo, email, coins, xp_total, vip, date_creation
                """,
                (
                    payload.pseudo,
                    payload.age,
                    payload.genre,
                    payload.region,
                    payload.pays,
                    payload.email,
                    hashed_password,
                    payload.avatar,
                    payload.league_regarde,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                "id": row["id"],
                "pseudo": row["pseudo"],
                "email": row["email"],
                "coins": row["coins"],
                "xp_total": row["xp_total"],
                "vip": row["vip"],
                "date_creation": row["date_creation"],
            }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest):
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash FROM users WHERE email = %s", (payload.email,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="Identifiants invalides.")

            if not _verify_password(payload.password, row["password_hash"]):
                raise HTTPException(status_code=401, detail="Identifiants invalides.")

            access_token = _create_access_token(str(row["id"]))
            refresh_token = _db._issue_refresh_token(conn, row["id"])
            conn.commit()
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
            }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest):
    token_hash = _db._hash_value(payload.refresh_token)
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, expires_at, revoked_at
                FROM user_refresh_tokens
                WHERE token_hash = %s
                """,
                (token_hash,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="Refresh token invalide.")

            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if row["revoked_at"] is not None or row["expires_at"] <= now:
                raise HTTPException(status_code=401, detail="Refresh token expire ou revoque.")

            cur.execute(
                "UPDATE user_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = %s",
                (row["id"],),
            )
            access_token = _create_access_token(str(row["user_id"]))
            new_refresh_token = _db._issue_refresh_token(conn, row["user_id"])
            conn.commit()
            return {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer",
            }


@router.post("/logout")
def logout(payload: RefreshTokenRequest):
    token_hash = _db._hash_value(payload.refresh_token)
    with _db.get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE token_hash = %s AND revoked_at IS NULL
                """,
                (token_hash,),
            )
            conn.commit()
            return {"revoked": cur.rowcount > 0}


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(_get_current_user)):
    return {
        "id": current_user["id"],
        "pseudo": current_user["pseudo"],
        "email": current_user["email"],
        "coins": current_user["coins"],
        "xp_total": current_user["xp_total"],
        "vip": current_user["vip"],
        "date_creation": current_user["date_creation"],
    }
