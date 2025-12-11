from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.users import UserCreate, UserOut
from app.services.users_service import create_user, authenticate
from app.db.models import User

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == user.email).first()
    if exists:
        raise HTTPException(400, "Email déjà utilisé")
    return create_user(db, user.email, user.password)

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    token = authenticate(db, user.email, user.password)
    if not token:
        raise HTTPException(401, "Identifiants invalides")
    return {"access_token": token}
