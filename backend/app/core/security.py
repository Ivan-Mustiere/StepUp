import base64
import hashlib
import hmac
import logging
import os
import secrets
import string
import re
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core import database as _db
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET_KEY

logger = logging.getLogger("stepup")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _generate_friend_code() -> str:
    """Génère un code ami unique au format xxxx-xxxx-xxxx."""
    chars = string.ascii_lowercase + string.digits
    groups = ["".join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
    return "-".join(groups)


def _create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
        logger.warning("Valeur de mot de passe stockee malformee.")
        return False
    test_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hmac.compare_digest(test_digest, stored_digest)


async def _get_current_user(token: str = Depends(oauth2_scheme)):
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

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, pseudo, email, age, genre, pays, region,
                       coins, coins_en_jeu, gems, xp_total, vip, date_creation, is_admin, avatar, friend_code
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise credentials_exception
            return row


def _require_admin(current_user):
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs.")
