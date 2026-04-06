import os
import re
import base64
import hashlib
import hmac
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
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    pseudo: str
    email: str
    coins: int
    xp_total: int
    vip: bool
    date_creation: datetime


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
                SELECT id, pseudo, email, coins, xp_total, vip, date_creation
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

            token = _create_access_token(str(user_id))
            return {"access_token": token, "token_type": "bearer"}
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
