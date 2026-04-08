import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import ALLOWED_ORIGINS, ENVIRONMENT
from app.core.database import close_pool, init_pool
from app.routes import admin, auth, communautes, equipes, friends, messages, paris, pronostics, steps, users

UPLOADS_DIR = "/app/uploads/avatars"
os.makedirs(UPLOADS_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    if ENVIRONMENT == "development":
        from app.core.seed import seed_dev_data
        seed_dev_data()
    yield
    await close_pool()


app = FastAPI(
    title="StepUp API",
    version="1.0.0",
    description="API backend accessible depuis l'application mobile",
    docs_url="/swagger",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    headers = {}
    if origin and origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/swagger")


@app.get("/api/v1/message")
def message():
    return {"message": "StepUp API operationnelle"}
