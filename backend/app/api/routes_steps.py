from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.steps import StepCreate
from app.services.steps_service import add_steps
from app.db.session import get_db

router = APIRouter(prefix="/steps", tags=["steps"])

@router.post("/add")
def add(data: StepCreate, user_id: int, db: Session = Depends(get_db)):
    return add_steps(db, user_id, data.steps)
