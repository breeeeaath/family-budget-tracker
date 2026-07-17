# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, Orchestration; CONCEPT(7): ApplicationEntry; TECH(9): FastAPI, CORS, Lifespan]
## @modulecontract
## @purpose Bootstrap the FastAPI application — wire CORS, register routers, set up schema auto‑creation on startup, and expose a health‑check endpoint. This is the single entry point for uvicorn.
## @scope FastAPI app creation, middleware (CORS), router inclusion, lifespan, health check.
## @input Configuration from config.settings, routers from routers/.
## @output ASGI application object consumed by uvicorn.
## @links [ORCHESTRATES(9): backend.app.routers.auth.router, backend.app.routers.categories.router, backend.app.routers.transactions.router, backend.app.routers.analytics.router]
## @invariants
## - CORS allows localhost:5173 with credentials.
## - Tables are created on first successful startup.
## - /health always returns {"status": "ok"} without auth.
## @rationale
## Q: Why lifespan instead of @app.on_event("startup")?
## A: Lifespan is the modern ASGI pattern; it properly handles async startup/teardown with context managers.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial FastAPI app with auth router and health check.]
## @modulemap
## VAR 10[FastAPI application instance] => app
## ENDPOINT 5[Health check — always 200] => GET /health
## @usecases
## - [app_startup]: uvicorn → main:app → lifespan creates tables → ready for requests
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: FastAPI, main, CORS, lifespan, health check, router, uvicorn, app, middleware, create_all
# STRUCTURE: ▶ ⚡ FastAPI() → ○ lifespan: Base.metadata.create_all → ○ include_router(auth) → ⊕ CORS middleware(localhost:5173, credentials) → GET /health → {"status":"ok"}

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.database import engine, Base
from backend.app.routers.auth import router as auth_router
from backend.app.routers.categories import router as categories_router
from backend.app.routers.transactions import router as transactions_router
from backend.app.routers.analytics import router as analytics_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"[IMP:7][lifespan][STARTUP] Creating database tables if not exist. [BOUNDARY]")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"[IMP:7][lifespan][STARTUP] Tables ready. [BOUNDARY]")
    yield
    logger.info(f"[IMP:7][lifespan][SHUTDOWN] Application shutting down. [BOUNDARY]")


app = FastAPI(title="Wallet API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(analytics_router)


@app.get("/health")
async def health_check():
    logger.debug(f"[IMP:4][health_check][OK] Health check passed.")
    return {"status": "ok"}
