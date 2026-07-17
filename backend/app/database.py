# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, Infrastructure; CONCEPT(7): DataPersistence; TECH(9): SQLAlchemyAsync, asyncpg]
## @modulecontract
## @purpose Provide a reusable async SQLAlchemy engine and session factory so every data‑access layer can open lightweight transactional sessions without manual connection management.
## @scope Engine creation, session lifecycle, declarative base for ORM models, dependency‑injection generator.
## @input settings.DATABASE_URL (from config.py) — async PostgreSQL DSN.
## @output AsyncSession via async_session_maker; Base class for model inheritance; get_db async generator.
## @links [READS_DATA_FROM(9): config.settings.DATABASE_URL]
## @invariants
## - engine is created exactly once per process.
## - get_db always yields a session that is closed on teardown.
## @rationale
## Q: Why async_session_maker instead of per‑request create_async_engine?
## A: Engine is expensive to create; sessionmaker reuses the pool. Async generator guarantees session.close() even on exceptions.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial async database module.]
## @modulemap
## VAR 9[Async SQLAlchemy engine] => engine
## VAR 9[Async session factory] => async_session_maker
## VAR 9[Declarative base] => Base
## FUNC 10[Yield async session per request] => get_db
## @usecases
## - [get_db]: Router endpoint → Depends(get_db) → transactional session → commit/rollback → session closed
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: database, SQLAlchemy, async engine, session, asyncpg, get_db, declarative base, sessionmaker
# STRUCTURE: ▶ ⚡ ┌config.settings.DATABASE_URL┐ → create_async_engine → async_session_maker → ○ get_db() yield session → ⎷ session.close()

import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# region FUNC_get_db [DOMAIN(7): DataPersistence; CONCEPT(8): DependencyInjection; TECH(9): AsyncSession]
## @purpose Yield a per‑request async SQLAlchemy session that is guaranteed to be closed on scope exit — the canonical dependency for FastAPI route handlers.
## @uses async_session_maker
## @io None -> AsyncGenerator[AsyncSession]
## @complexity 2
async def get_db():
    async with async_session_maker() as session:
        logger.debug(f"[IMP:5][get_db][SESSION_OPEN] Session opened.")
        yield session
        logger.debug(f"[IMP:5][get_db][SESSION_CLOSE] Session closed.")
# endregion FUNC_get_db
