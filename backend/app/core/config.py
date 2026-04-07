import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://appuser:secret@db:5432/appdb"
).replace("+psycopg2", "")

_JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not _JWT_SECRET_KEY or _JWT_SECRET_KEY == "change-me-in-production":
    raise RuntimeError(
        "JWT_SECRET_KEY n'est pas defini ou utilise la valeur par defaut. "
        "Definissez une cle secrete forte dans votre fichier .env."
    )
JWT_SECRET_KEY = _JWT_SECRET_KEY
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081"]
)
