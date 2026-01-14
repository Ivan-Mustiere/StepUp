"""
models.py

Modèles SQLAlchemy pour l'application mobile de paris basés sur le nombre de pas.
Base PostgreSQL – SQLAlchemy 2.x compatible
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    Date,
    DateTime,
    Enum,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum


# =========================
# ENUMS
# =========================

class BetStatus(enum.Enum):
    pending = "pending"
    win = "win"
    lose = "lose"


# =========================
# USER
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    pseudo = Column(String(50), unique=True)
    avatar = Column(String(255))

    coins = Column(Integer, default=0, nullable=False)
    xp_total = Column(Integer, default=0, nullable=False)
    xp_week = Column(Integer, default=0, nullable=False)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_vip = Column(Boolean, default=False)

    streak = Column(Integer, default=0, nullable=False)
    total_steps = Column(Integer, default=0, nullable=False)

    last_step_sync = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))

    email_verified_at = Column(DateTime(timezone=True))
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(coins >= 0, name="check_coins_positive"),
        CheckConstraint(total_steps >= 0, name="check_total_steps_positive"),
    )

    # Relations
    step_records = relationship(
        "StepRecord",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    bets = relationship(
        "Bet",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    purchases = relationship(
        "Purchase",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# =========================
# STEP RECORD (PAS JOURNALIERS)
# =========================

class StepRecord(Base):
    __tablename__ = "step_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    date = Column(Date, nullable=False)
    steps = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(steps >= 0, name="check_steps_non_negative"),
        UniqueConstraint("user_id", "date", name="uniq_user_day_steps"),
    )

    user = relationship("User", back_populates="step_records")


# =========================
# BET (PARIS)
# =========================

class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    step_goal = Column(Integer, nullable=False)
    bet_amount = Column(Integer, nullable=False)
    potential_gain = Column(Integer, nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    status = Column(Enum(BetStatus), default=BetStatus.pending, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(step_goal > 0, name="check_step_goal_positive"),
        CheckConstraint(bet_amount > 0, name="check_bet_amount_positive"),
        CheckConstraint(potential_gain > 0, name="check_gain_positive"),
        CheckConstraint("end_date >= start_date", name="check_bet_dates"),
    )

    user = relationship("User", back_populates="bets")
    resolution = relationship(
        "BetResolution",
        back_populates="bet",
        uselist=False,
        cascade="all, delete-orphan"
    )


# =========================
# BET RESOLUTION (AUDIT)
# =========================

class BetResolution(Base):
    __tablename__ = "bet_resolutions"

    id = Column(Integer, primary_key=True)
    bet_id = Column(Integer, ForeignKey("bets.id", ondelete="CASCADE"), unique=True)

    total_steps = Column(Integer, nullable=False)
    resolved_at = Column(DateTime(timezone=True), server_default=func.now())

    bet = relationship("Bet", back_populates="resolution")


# =========================
# SHOP
# =========================

class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    description = Column(String(255))
    cost = Column(Integer, nullable=False)

    is_active = Column(Boolean, default=True)

    __table_args__ = (
        CheckConstraint(cost >= 0, name="check_cost_positive"),
    )


# =========================
# PURCHASE
# =========================

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uniq_user_item"),
    )

    user = relationship("User", back_populates="purchases")
    item = relationship("ShopItem")