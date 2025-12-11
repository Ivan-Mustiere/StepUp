from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine
from app.api import routes_users, routes_steps

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Walking Points API")

app.include_router(routes_users.router)
app.include_router(routes_steps.router)
