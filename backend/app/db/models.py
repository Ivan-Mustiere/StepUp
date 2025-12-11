"""
models.py

Définit toutes les tables de la base de données sous forme de modèles SQLAlchemy.
Chaque classe correspond à une table dans PostgreSQL.

Tables créées :
- User        : les utilisateurs de l'app
- StepRecord  : les pas enregistrés par les utilisateurs
- Bet         : les paris des utilisateurs
- ShopItem    : les articles disponibles dans le shop
- Purchase    : les achats effectués par les utilisateurs
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    points = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relations
    steps = relationship("StepRecord", back_populates="user")
    bets = relationship("Bet", back_populates="user")
    purchases = relationship("Purchase", back_populates="user")


class StepRecord(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    steps = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="steps")


class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    outcome = Column(String, nullable=True)  # 'win', 'lose', 'pending'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bets")


class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cost = Column(Integer, nullable=False)


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="purchases")
    item = relationship("ShopItem")
