from sqlalchemy.orm import Session
from app.db.models import Step, User

POINTS_PER_100_STEPS = 1

def add_steps(db: Session, user_id: int, steps: int):
    step = Step(user_id=user_id, steps=steps)
    db.add(step)

    user = db.query(User).filter(User.id == user_id).first()
    earned = (steps // 100) * POINTS_PER_100_STEPS

    user.points += earned

    db.commit()
    return {"earned": earned, "total_points": user.points}
