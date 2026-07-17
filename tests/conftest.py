# region MODULE_CONTRACT [DOMAIN(7): Testing; CONCEPT(8): AntiLoop, Fixtures; TECH(9): pytest, httpx, SQLAlchemyAsync]
## @modulecontract
## @purpose Central test infrastructure: Anti‑Loop Protocol (attempt counter), async HTTP client fixture with isolated SQLite DB, and pre‑authenticated cookie headers. Prevents infinite retry loops by tracking test session failures.
## @scope pytest session hooks, httpx AsyncClient for FastAPI, isolated SQLite engine override, auth cookie fixture.
## @input Test files, FastAPI app from main.py.
## @output Fixtures: async_client, auth_headers; session‑level counter state.
## @links [DEPENDS_ON(8): backend.app.database, backend.app.main]
## @invariants
## - .test_counter.json is always JSON with "count" (int) field.
## - Session start resets counter only on successful prior run.
## - Session finish increments counter if any test failed; resets to 0 on 100% PASS.
## - async_client fixture creates an isolated in‑memory SQLite DB and overrides FastAPI get_db.
## @rationale
## Q: Why Anti‑Loop Protocol?
## A: Without it, an agent might retry the exact same broken code N times. The counter forces reflection after repeated failures.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial test infrastructure with Anti‑Loop Protocol.]
## @modulemap
## FUNC 8[Reset counter on session start] => pytest_sessionstart
## FUNC 9[Update counter on session finish] => pytest_sessionfinish
## FIXTURE 10[Isolated FastAPI test client with SQLite] => async_client
## FIXTURE 10[Pre‑registered user + auth cookie] => auth_headers
## @usecases
## - [pytest_sessionfinish]: TestRunner → all tests finish → 100% PASS → reset counter
## - [async_client]: test_register_and_login → use async_client → SQLite DB → no external PostgreSQL needed
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: conftest, pytest, Anti-Loop, counter, fixtures, async_client, SQLite, httpx, ASGITransport, FastAPI, auth cookie
# STRUCTURE: ▶ pytest_sessionstart → ○ load/test_counter.json → count; ▶ pytest_sessionfinish → ○ testsfailed ? count++ : reset0 → write; ▶ fixture async_client → ⚡ SQLite :memory: → create_all → override get_db → ASGITransport(app) → AsyncClient; ▶ fixture auth_headers → ○ POST /auth/register → extract cookie

import json
import os
import logging
import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.database import Base
from backend.app.dependencies import get_db as orig_get_db
from backend.app.main import app

COUNTER_FILE = os.path.join(os.path.dirname(__file__), ".test_counter.json")

logger = logging.getLogger(__name__)


def pytest_sessionstart(session):
    if os.path.exists(COUNTER_FILE):
        with open(COUNTER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        count = data.get("count", 0)
    else:
        count = 0

    if count > 0:
        print(f"\n[ANTI-LOOP] Previous run had failures. Attempt counter: {count}")
        print("[ANTI-LOOP] CHECKLIST:")
        print("  - Are dependencies installed? (pip install -r requirements.txt)")
        print("  - Is SQLite driver available? (aiosqlite)")
        print("  - Are all imports correct?")
        print("  - Is the test DB properly isolated?")
        if count >= 2:
            print("[ANTI-LOOP] Use MCP 'tavily' or 'Context 7' to find a solution online.")
        if count >= 3:
            print("[ANTI-LOOP] WARNING: Looping risk! Pause and reflect. Are you repeating a failed strategy?")
        if count >= 4:
            print("[ANTI-LOOP] CRITICAL ERROR: Agent looping detected. STOP. Formulate a help request for an operator.")

    with open(COUNTER_FILE, "w", encoding="utf-8") as f:
        json.dump({"count": count}, f)


def pytest_sessionfinish(session, exitstatus):
    if os.path.exists(COUNTER_FILE):
        with open(COUNTER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        count = data.get("count", 0)
    else:
        count = 0

    if exitstatus == 0:
        count = 0
        print(f"\n[ANTI-LOOP] All tests PASSED. Counter reset to 0.")
    else:
        count += 1
        print(f"\n[ANTI-LOOP] Tests FAILED. Counter incremented to {count}.")

    with open(COUNTER_FILE, "w", encoding="utf-8") as f:
        json.dump({"count": count}, f)


@pytest_asyncio.fixture
async def async_client():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with test_session_maker() as session:
            yield session

    app.dependency_overrides[orig_get_db] = override_get_db
    app.router.lifespan_context = None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest_asyncio.fixture
async def auth_headers(async_client):
    name = "testuser"
    password = "testpass123"

    resp = await async_client.post("/auth/register", json={"name": name, "password": password})
    assert resp.status_code == 200, f"Register failed in auth_headers fixture: {resp.text}"

    cookie = resp.headers.get("set-cookie", "")
    token_part = ""
    for part in cookie.split("; "):
        if part.startswith("access_token="):
            token_part = part
            break

    return {
        "name": name,
        "password": password,
        "cookie": cookie,
        "token_part": token_part,
    }
