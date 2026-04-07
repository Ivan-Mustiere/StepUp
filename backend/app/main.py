import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import ALLOWED_ORIGINS
from app.core.database import ensure_extended_schema
from app.routes import admin, auth, communautes, friends, pronostics

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
app.include_router(admin.router)


@app.on_event("startup")
def startup():
    ensure_extended_schema()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/swagger")


@app.get("/api/v1/message")
def message():
    return {"message": "StepUp API operationnelle"}
