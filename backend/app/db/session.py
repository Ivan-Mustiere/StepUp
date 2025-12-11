"""
session.py

Ce fichier configure la connexion à la base de données PostgreSQL
et fournit une session utilisable dans tout le backend.

- engine       : moteur SQLAlchemy pour se connecter à PostgreSQL
- SessionLocal : fabrique des sessions de travail (CRUD)
- get_db       : fonction utilitaire FastAPI pour obtenir une session par requête
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Crée le moteur SQLAlchemy avec l'URL de la DB
engine = create_engine(settings.DATABASE_URL)

# Configure la session : pas de commit automatique, flush désactivé
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Fonction utilitaire pour FastAPI.
    Fournit une session SQLAlchemy et s'assure qu'elle se ferme correctement.
    Usage dans une route :
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
