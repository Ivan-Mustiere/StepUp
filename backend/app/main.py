import os
import re
import base64
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import psycopg2
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, field_validator


app = FastAPI(
    title="StepUp API",
    version="1.0.0",
    description="API backend accessible depuis l'application mobile",
    docs_url="/swagger",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://appuser:secret@db:5432/appdb"
).replace("+psycopg2", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# A ajuster en production avec les domaines autorises.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/swagger")


@app.get("/api/v1/message")
def message():
    return {"message": "StepUp API operationnelle"}


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


class FriendRequestCreate(BaseModel):
    friend_user_id: int


class CommunityJoinRequest(BaseModel):
    communaute_id: int


class PronosticCreate(BaseModel):
    titre: str
    prediction: str
    description: str | None = None
    cote: float | None = None


class BetCreate(BaseModel):
    pronostic_id: int
    description: str | None = None
    mise_min: int = 0


class RefreshTokenRequest(BaseModel):
    refresh_token: str


def _connect():
    parsed = urlparse(DATABASE_URL)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=(parsed.path or "").lstrip("/"),
    )


def _create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{base64.b64encode(salt).decode()}:{base64.b64encode(digest).decode()}"


def _verify_password(password: str, stored_value: str) -> bool:
    try:
        salt_b64, digest_b64 = stored_value.split(":", 1)
        salt = base64.b64decode(salt_b64.encode())
        stored_digest = base64.b64decode(digest_b64.encode())
    except Exception:
        return False

    test_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hmac.compare_digest(test_digest, stored_digest)


def _get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expire.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, pseudo, email, coins, xp_total, vip, date_creation, is_admin
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise credentials_exception
            return row
    finally:
        conn.close()


def _require_admin(current_user):
    if not current_user[7]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs.")


def _issue_refresh_token(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    token_hash = _hash_value(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )
    return token


@app.on_event("startup")
def ensure_extended_schema():
    conn = None
    last_error = None
    for _ in range(15):
        try:
            conn = _connect()
            break
        except psycopg2.OperationalError as exc:
            last_error = exc
            time.sleep(1)
    if conn is None:
        raise RuntimeError(f"Connexion DB impossible au demarrage: {last_error}")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

                CREATE TABLE IF NOT EXISTS user_friend_requests (
                    id SERIAL PRIMARY KEY,
                    sender_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    receiver_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(sender_user_id, receiver_user_id),
                    CHECK (sender_user_id <> receiver_user_id)
                );

                CREATE TABLE IF NOT EXISTS user_community_requests (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    communaute_id INT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, communaute_id)
                );

                CREATE TABLE IF NOT EXISTS pronostics (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    titre VARCHAR(255) NOT NULL,
                    description TEXT,
                    prediction VARCHAR(255) NOT NULL,
                    cote NUMERIC(10, 2),
                    statut VARCHAR(20) NOT NULL DEFAULT 'ouvert'
                        CHECK (statut IN ('ouvert', 'termine', 'annule')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS paris (
                    id SERIAL PRIMARY KEY,
                    admin_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    pronostic_id INT NOT NULL REFERENCES pronostics(id) ON DELETE CASCADE,
                    description TEXT,
                    mise_min INT NOT NULL DEFAULT 0 CHECK (mise_min >= 0),
                    statut VARCHAR(20) NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'ferme', 'regle')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_refresh_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    revoked_at TIMESTAMP
                );
                """
            )
            conn.commit()
    finally:
        conn.close()


@app.post("/api/v1/auth/register", response_model=UserResponse, status_code=201)
def register(payload: RegisterRequest):
    hashed_password = _hash_password(payload.password)
    conn = _connect()
    try:
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
            user_row = cur.fetchone()
            conn.commit()
            return {
                "id": user_row[0],
                "pseudo": user_row[1],
                "email": user_row[2],
                "coins": user_row[3],
                "xp_total": user_row[4],
                "vip": user_row[5],
                "date_creation": user_row[6],
            }
    finally:
        conn.close()


@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash FROM users WHERE email = %s", (payload.email,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="Identifiants invalides.")

            user_id, password_hash = row
            if not _verify_password(payload.password, password_hash):
                raise HTTPException(status_code=401, detail="Identifiants invalides.")

            access_token = _create_access_token(str(user_id))
            refresh_token = _issue_refresh_token(conn, user_id)
            conn.commit()
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
            }
    finally:
        conn.close()


@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest):
    token_hash = _hash_value(payload.refresh_token)
    conn = _connect()
    try:
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

            token_id, user_id, expires_at, revoked_at = row
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if revoked_at is not None or expires_at <= now:
                raise HTTPException(status_code=401, detail="Refresh token expire ou revoque.")

            cur.execute(
                "UPDATE user_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = %s",
                (token_id,),
            )
            access_token = _create_access_token(str(user_id))
            new_refresh_token = _issue_refresh_token(conn, user_id)
            conn.commit()
            return {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer",
            }
    finally:
        conn.close()


@app.post("/api/v1/auth/logout")
def logout(payload: RefreshTokenRequest):
    token_hash = _hash_value(payload.refresh_token)
    conn = _connect()
    try:
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
    finally:
        conn.close()


@app.get("/api/v1/auth/me", response_model=UserResponse)
def me(current_user=Depends(_get_current_user)):
    return {
        "id": current_user[0],
        "pseudo": current_user[1],
        "email": current_user[2],
        "coins": current_user[3],
        "xp_total": current_user[4],
        "vip": current_user[5],
        "date_creation": current_user[6],
    }


@app.post("/api/v1/friends/requests", status_code=201)
def send_friend_request(payload: FriendRequestCreate, current_user=Depends(_get_current_user)):
    if payload.friend_user_id == current_user[0]:
        raise HTTPException(status_code=400, detail="Impossible de s'ajouter soi-meme.")

    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE id = %s", (payload.friend_user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Utilisateur cible introuvable.")

            cur.execute(
                """
                INSERT INTO user_friend_requests (sender_user_id, receiver_user_id)
                VALUES (%s, %s)
                ON CONFLICT (sender_user_id, receiver_user_id) DO UPDATE
                SET status = 'pending', created_at = CURRENT_TIMESTAMP
                RETURNING id, status
                """,
                (current_user[0], payload.friend_user_id),
            )
            req = cur.fetchone()
            conn.commit()
            return {"request_id": req[0], "status": req[1]}
    finally:
        conn.close()


@app.post("/api/v1/friends/requests/{request_id}/accept")
def accept_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, sender_user_id, receiver_user_id, status
                FROM user_friend_requests
                WHERE id = %s
                """,
                (request_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Demande introuvable.")
            if row[2] != current_user[0]:
                raise HTTPException(status_code=403, detail="Cette demande ne vous appartient pas.")
            if row[3] != "pending":
                raise HTTPException(status_code=400, detail="Demande deja traitee.")

            cur.execute(
                "UPDATE user_friend_requests SET status = 'accepted' WHERE id = %s",
                (request_id,),
            )
            cur.execute(
                """
                INSERT INTO user_friends (user_id, friend_user_id)
                VALUES (%s, %s), (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (row[1], row[2], row[2], row[1]),
            )
            conn.commit()
            return {"status": "accepted"}
    finally:
        conn.close()


@app.post("/api/v1/friends/requests/{request_id}/reject")
def reject_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_friend_requests
                SET status = 'rejected'
                WHERE id = %s AND receiver_user_id = %s AND status = 'pending'
                """,
                (request_id, current_user[0]),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Demande introuvable, deja traitee, ou non autorisee.",
                )
            conn.commit()
            return {"status": "rejected"}
    finally:
        conn.close()


@app.delete("/api/v1/friends/requests/{request_id}")
def cancel_friend_request(request_id: int, current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_friend_requests
                WHERE id = %s AND sender_user_id = %s AND status = 'pending'
                """,
                (request_id, current_user[0]),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Demande introuvable, deja traitee, ou non autorisee.",
                )
            conn.commit()
            return {"status": "cancelled"}
    finally:
        conn.close()


@app.get("/api/v1/friends/requests/incoming")
def list_incoming_friend_requests(current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.sender_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.sender_user_id
                WHERE r.receiver_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user[0],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r[0],
                    "sender_user_id": r[1],
                    "sender_pseudo": r[2],
                    "sender_email": r[3],
                    "status": r[4],
                    "created_at": r[5],
                }
                for r in rows
            ]
    finally:
        conn.close()


@app.get("/api/v1/friends/requests/outgoing")
def list_outgoing_friend_requests(current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.receiver_user_id, u.pseudo, u.email, r.status, r.created_at
                FROM user_friend_requests r
                JOIN users u ON u.id = r.receiver_user_id
                WHERE r.sender_user_id = %s
                ORDER BY r.created_at DESC
                """,
                (current_user[0],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r[0],
                    "receiver_user_id": r[1],
                    "receiver_pseudo": r[2],
                    "receiver_email": r[3],
                    "status": r[4],
                    "created_at": r[5],
                }
                for r in rows
            ]
    finally:
        conn.close()


@app.post("/api/v1/communautes/rejoindre", status_code=201)
def request_join_community(
    payload: CommunityJoinRequest, current_user=Depends(_get_current_user)
):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_community_requests (user_id, communaute_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, communaute_id) DO UPDATE
                SET status = 'pending', created_at = CURRENT_TIMESTAMP
                RETURNING id, status
                """,
                (current_user[0], payload.communaute_id),
            )
            req = cur.fetchone()
            conn.commit()
            return {"request_id": req[0], "status": req[1]}
    finally:
        conn.close()


@app.get("/api/v1/communautes/requests/me")
def list_my_community_requests(current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, communaute_id, status, created_at
                FROM user_community_requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (current_user[0],),
            )
            rows = cur.fetchall()
            return [
                {
                    "request_id": r[0],
                    "communaute_id": r[1],
                    "status": r[2],
                    "created_at": r[3],
                }
                for r in rows
            ]
    finally:
        conn.close()


@app.delete("/api/v1/communautes/requests/{request_id}")
def cancel_community_request(request_id: int, current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_community_requests
                WHERE id = %s AND user_id = %s AND status = 'pending'
                """,
                (request_id, current_user[0]),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Demande introuvable, deja traitee, ou non autorisee.",
                )
            conn.commit()
            return {"status": "cancelled"}
    finally:
        conn.close()


@app.post("/api/v1/pronostics", status_code=201)
def create_pronostic(payload: PronosticCreate, current_user=Depends(_get_current_user)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pronostics (user_id, titre, description, prediction, cote)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, statut, created_at
                """,
                (
                    current_user[0],
                    payload.titre,
                    payload.description,
                    payload.prediction,
                    payload.cote,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {"pronostic_id": row[0], "statut": row[1], "created_at": row[2]}
    finally:
        conn.close()


@app.post("/api/v1/admin/paris", status_code=201)
def create_bet_admin(payload: BetCreate, current_user=Depends(_get_current_user)):
    _require_admin(current_user)
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pronostics WHERE id = %s", (payload.pronostic_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Pronostic introuvable.")

            cur.execute(
                """
                INSERT INTO paris (admin_user_id, pronostic_id, description, mise_min)
                VALUES (%s, %s, %s, %s)
                RETURNING id, statut, created_at
                """,
                (
                    current_user[0],
                    payload.pronostic_id,
                    payload.description,
                    payload.mise_min,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {"pari_id": row[0], "statut": row[1], "created_at": row[2]}
    finally:
        conn.close()
