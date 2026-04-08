import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import ALLOWED_ORIGINS, ENVIRONMENT
from app.core.database import init_pool
from app.routes import admin, auth, communautes, equipes, friends, messages, paris, pronostics, steps, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="StepUp API",
    version="1.0.0",
    description="API backend accessible depuis l'application mobile",
    docs_url="/swagger",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(communautes.router)
app.include_router(pronostics.router)
app.include_router(paris.router)
app.include_router(messages.router)
app.include_router(admin.router)
app.include_router(steps.router)
app.include_router(users.router)
app.include_router(equipes.router)


@app.on_event("startup")
def startup():
    init_pool()
    if ENVIRONMENT == "development":
        from app.core.seed import seed_dev_data
        seed_dev_data()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/swagger")


@app.get("/api/v1/message")
def message():
    return {"message": "StepUp API operationnelle"}
