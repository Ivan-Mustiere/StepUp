"""
seed.py
Script pour insérer l’admin et les items du shop.
À exécuter après la création des tables.
"""

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import User, ShopItem
from app.core.security import get_password_hash
import os

def seed():
    db: Session = SessionLocal()

    # Admin
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            points=10000
        )
        db.add(admin)

    # Shop
    default_items = [
        {"name": "Boisson énergétique", "cost": 50},
        {"name": "T-shirt premium", "cost": 200},
        {"name": "Skin rare", "cost": 500},
    ]
    existing_items = {item.name for item in db.query(ShopItem).all()}
    for item in default_items:
        if item["name"] not in existing_items:
            db.add(ShopItem(**item))

    db.commit()
    db.close()
    print("Seed completed.")

if __name__ == "__main__":
    seed()
