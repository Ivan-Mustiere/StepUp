from pydantic import BaseModel

class StepCreate(BaseModel):
    steps: int
