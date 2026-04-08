import os
import re
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, field_validator

import app.core.database as _db
from app.core.security import _get_current_user, _hash_password, _verify_password

AVATARS_DIR = "/app/uploads/avatars"
AVATAR_MAX_SIZE = 5 * 1024 * 1024  # 5 Mo
AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    pseudo: str | None = None
    email: str | None = None
    age: int | None = None
    genre: str | None = None
    pays: str | None = None
    region: str | None = None

    @field_validator("pseudo")
    @classmethod
    def validate_pseudo(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if len(value) < 3:
                raise ValueError("Le pseudo doit contenir au moins 3 caractères.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
                raise ValueError("Email invalide.")
        return value

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: int | None) -> int | None:
        if value is not None and value < 16:
            raise ValueError("Age minimum : 16 ans.")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Mot de passe trop court (8 caractères min).")
        rules = [
            re.search(r"[A-Z]", value),
            re.search(r"[a-z]", value),
            re.search(r"[0-9]", value),
            re.search(r"[^A-Za-z0-9]", value),
        ]
        if not all(rules):
            raise ValueError(
                "Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial."
            )
        return value


@router.patch("/me")
async def update_profile(payload: UpdateProfileRequest, current_user=Depends(_get_current_user)):
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour.")

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            if "pseudo" in fields:
                await cur.execute(
                    "SELECT 1 FROM users WHERE pseudo = %s AND id != %s",
                    (fields["pseudo"], current_user["id"]),
                )
                if await cur.fetchone():
                    raise HTTPException(status_code=409, detail="Pseudo déjà utilisé.")

            if "email" in fields:
                await cur.execute(
                    "SELECT 1 FROM users WHERE email = %s AND id != %s",
                    (fields["email"], current_user["id"]),
                )
                if await cur.fetchone():
                    raise HTTPException(status_code=409, detail="Email déjà utilisé.")

            set_clause = ", ".join(f"{k} = %s" for k in fields)
            values = list(fields.values()) + [current_user["id"]]
            await cur.execute(
                f"UPDATE users SET {set_clause} WHERE id = %s "
                "RETURNING id, pseudo, email, coins, xp_total, vip, date_creation",
                values,
            )
            row = await cur.fetchone()
            await conn.commit()
            return dict(row)


@router.post("/me/password")
async def change_password(payload: ChangePasswordRequest, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT password_hash FROM users WHERE id = %s", (current_user["id"],))
            row = await cur.fetchone()
            if not _verify_password(payload.current_password, row["password_hash"]):
                raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

            new_hash = _hash_password(payload.new_password)
            await cur.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (new_hash, current_user["id"]),
            )
            await conn.commit()
            return {"status": "updated"}


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(_get_current_user)):
    if file.content_type not in AVATAR_ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPEG, PNG ou WebP.")

    content = await file.read()
    if len(content) > AVATAR_MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image trop grande (5 Mo maximum).")

    ext = "jpg" if file.content_type == "image/jpeg" else file.content_type.split("/")[1]
    filename = f"{current_user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(AVATARS_DIR, filename)

    # Redimensionner à 256×256 max
    import io
    img = Image.open(io.BytesIO(content))
    img = img.convert("RGB")
    img.thumbnail((256, 256), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)

    os.makedirs(AVATARS_DIR, exist_ok=True)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(buf.read())

    avatar_url = f"/uploads/avatars/{filename}"

    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            # Supprimer l'ancien avatar si existant
            await cur.execute("SELECT avatar FROM users WHERE id = %s", (current_user["id"],))
            row = await cur.fetchone()
            if row and row["avatar"]:
                old_path = "/app" + row["avatar"]
                if os.path.isfile(old_path):
                    os.remove(old_path)

            await cur.execute(
                "UPDATE users SET avatar = %s WHERE id = %s",
                (avatar_url, current_user["id"]),
            )
            await conn.commit()

    return {"avatar_url": avatar_url}


@router.get("/{user_id}")
async def get_user_profile(user_id: int, current_user=Depends(_get_current_user)):
    async with _db.get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
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
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
            return dict(row)
