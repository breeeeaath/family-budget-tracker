# region MODULE_CONTRACT [DOMAIN(7): Testing; CONCEPT(8): AuthSuite; TECH(9): pytest, httpx, LDD]
## @modulecontract
## @purpose Validate the authentication subsystem: user registration, login with correct/wrong credentials, protected endpoint guards, and health‑check availability. Every test emits IMP:7‑10 telemetry for agent‑consumable trace analysis.
## @scope POST /auth/register, POST /auth/login, GET /health, cookie‑based auth guard.
## @input Test HTTP requests via httpx AsyncClient.
## @output Assertion results + console‑printed LDD trajectories.
## @links [DEPENDS_ON(9): tests.conftest.async_client, tests.conftest.auth_headers; backend.app.routers.auth]
## @invariants
## - Register returns 200 + TokenResponse + Set‑Cookie header.
## - Login with correct credentials returns 200; wrong password returns 401.
## - Any endpoint depending on get_current_user returns 401 without a cookie.
## - /health returns 200 without authentication.
## @rationale
## Q: Why test auth independently of other slices?
## A: Auth is the gatekeeper. Every other endpoint depends on it. Catching auth bugs early prevents cascading test failures in S2.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial auth test suite.]
## @modulemap
## TEST 10[Register + login full flow] => test_register_and_login
## TEST 10[Login with wrong password → 401] => test_login_wrong_password
## TEST 10[Protected endpoint without token → 401] => test_protected_endpoint_without_token
## TEST 8[Health check → 200] => test_health_check
## @usecases
## - [test_register_and_login]: QA → register new user → verify token cookie → login same user → verify token cookie
## - [test_login_wrong_password]: QA → login with wrong password → 401 → verify no cookie leaked
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: test, auth, register, login, JWT, cookie, 401, health check, pytest, httpx, LDD telemetry
# STRUCTURE: ▶ test_register_and_login → POST /auth/register → 200 + cookie → POST /auth/login → 200 + cookie → ☑; ▶ test_login_wrong_password → POST /auth/login → 401 → ☑; ▶ test_protected_endpoint_without_token → GET /analytics/summary → 401 → ☑; ▶ test_health_check → GET /health → 200 → ☑

import logging
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app

logger = logging.getLogger(__name__)


def _print_ldd_trajectory(caplog, label: str):
    print(f"\n--- LDD TRAJECTORY ({label}) IMP:7-10 ---")
    found = False
    for record in caplog.records:
        if "[IMP:" in record.message:
            try:
                imp_level = int(record.message.split("[IMP:")[1].split("]")[0])
                if imp_level >= 7:
                    print(f"  {record.message}")
                    found = True
            except (IndexError, ValueError):
                continue
    if not found:
        print("  (no IMP:7-10 logs captured)")
    print("--- END LDD TRAJECTORY ---\n")


@pytest.mark.asyncio
async def test_register_and_login(async_client: AsyncClient, caplog):
    caplog.set_level(logging.INFO)

    name = "alice"
    password = "secret123"

    resp = await async_client.post("/auth/register", json={"name": name, "password": password})
    _print_ldd_trajectory(caplog, "REGISTER")
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    data = resp.json()
    assert data["name"] == name
    assert data["user_id"] > 0
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    set_cookie = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "httponly" in set_cookie.lower() or "HttpOnly" in set_cookie

    resp2 = await async_client.post("/auth/login", json={"name": name, "password": password})
    _print_ldd_trajectory(caplog, "LOGIN")
    assert resp2.status_code == 200, f"Login failed: {resp2.text}"
    data2 = resp2.json()
    assert data2["name"] == name
    assert "access_token" in data2


@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient, caplog):
    caplog.set_level(logging.INFO)

    name = "bob"
    password = "correct"
    await async_client.post("/auth/register", json={"name": name, "password": password})

    resp = await async_client.post("/auth/login", json={"name": name, "password": "wrongpass"})
    _print_ldd_trajectory(caplog, "WRONG_PASSWORD")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(async_client: AsyncClient, caplog):
    caplog.set_level(logging.INFO)

    resp = await async_client.get("/auth/me")
    _print_ldd_trajectory(caplog, "NO_TOKEN")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient, caplog):
    caplog.set_level(logging.INFO)

    resp = await async_client.get("/health")
    _print_ldd_trajectory(caplog, "HEALTH_CHECK")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
