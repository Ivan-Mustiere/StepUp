"""
base.py

Ce fichier contient la Base de SQLAlchemy. 
Toutes les classes modèles (tables) hériteront de cette Base.
"""

from sqlalchemy.orm import declarative_base

# Création de la base de données de référence pour SQLAlchemy
Base = declarative_base()
