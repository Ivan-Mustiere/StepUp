"""
session.py

Configuration de la connexion PostgreSQL via SQLAlchemy.
Fournit une session sûre et réutilisable pour FastAPI.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Création du moteur SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,     # évite les connexions mortes
    echo=settings.DB_ECHO,  # logs SQL en dev uniquement
    future=True             # SQLAlchemy 2.x
)

# Fabrique de sessions
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False
)

def get_db():
    """
    Dépendance FastAPI.
    Ouvre une session DB par requête et la ferme proprement.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
