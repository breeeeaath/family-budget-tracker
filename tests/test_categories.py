# region MODULE_CONTRACT [DOMAIN(7): Testing; CONCEPT(8): CRUD, ReferenceData; TECH(9): pytest, httpx, LDD]
## @modulecontract
## @purpose Validate category CRUD endpoints: authenticated creation, public listing sorted by name, and single‑category retrieval. Every test outputs IMP:7‑10 telemetry for agent‑consumable trace analysis.
## @scope POST /api/categories, GET /api/categories, GET /api/categories/{id}.
## @input Test HTTP requests via httpx AsyncClient.
## @output Assertion results + console‑printed LDD trajectories.
## @links [DEPENDS_ON(9): tests.conftest.async_client, tests.conftest.auth_headers; backend.app.routers.categories]
## @invariants
## - All tests run on isolated SQLite :memory: DB.
## - POST /api/categories requires auth; returns 201 + CategoryOut.
## - GET /api/categories returns list sorted by name; no auth required.
## - GET /api/categories/{id} returns 200 or 404.
## @rationale
## Q: Why test categories independently of transactions?
## A: Categories are reference data consumed by transaction creation. Catching category bugs early prevents cascading failures in transaction tests.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial categories test suite.]
## @modulemap
## TEST 10[Create category with auth] => test_create_category
## TEST 9[List all categories (public)] => test_list_categories
## TEST 8[Get category by id] => test_get_category_by_id
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: test, categories, create, list, get_by_id, 201, 404, pytest, httpx, LDD telemetry, auth
# STRUCTURE: ▶ test_create_category → POST /api/categories + cookie → 201 + verify fields → ☑; ▶ test_list_categories → GET /api/categories (no auth) → non‑empty list → ☑; ▶ test_get_category_by_id → create → GET /api/categories/{id} → verify name → ☑

import logging
import pytest
from httpx import AsyncClient

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


# region TEST_test_create_category [DOMAIN(7): Testing; CONCEPT(8): CRUD; TECH(9): pytest, httpx]
## @purpose Verify that an authenticated user can create a category and receive valid CategoryOut with all fields populated.
## @uses auth_headers fixture, httpx AsyncClient
## @complexity 4
@pytest.mark.asyncio
async def test_create_category(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    payload = {
        "name": "Продукты",
        "type": "EXPENSE",
        "icon": "shopping-cart",
        "color": "#FF5733",
    }

    resp = await async_client.post(
        "/api/categories",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "CREATE_CATEGORY")

    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["name"] == "Продукты"
    assert data["type"] == "EXPENSE"
    assert data["icon"] == "shopping-cart"
    assert data["color"] == "#FF5733"
    assert data["id"] > 0

    found_log = False
    for record in caplog.records:
        if "[IMP:9][create_category][CREATED]" in record.message:
            found_log = True
            break
    assert found_log, "Critical LDD Error: missing [IMP:9][create_category][CREATED]"
# endregion TEST_test_create_category


# region TEST_test_list_categories [DOMAIN(7): Testing; CONCEPT(7): Querying; TECH(8): pytest, httpx]
## @purpose Verify that the public categories list endpoint returns non‑empty sorted results without authentication.
## @uses async_client fixture
## @complexity 4
@pytest.mark.asyncio
async def test_list_categories(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    payload = {"name": "Транспорт", "type": "EXPENSE", "icon": "car", "color": "#00FF00"}
    await async_client.post(
        "/api/categories",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    payload2 = {"name": "Аренда", "type": "EXPENSE", "icon": "home", "color": "#0000FF"}
    await async_client.post(
        "/api/categories",
        json=payload2,
        headers={"Cookie": auth_headers["token_part"]},
    )

    resp = await async_client.get("/api/categories")
    _print_ldd_trajectory(caplog, "LIST_CATEGORIES")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    names = [c["name"] for c in data]
    assert names == sorted(names), f"Categories not sorted by name: {names}"
# endregion TEST_test_list_categories


# region TEST_test_get_category_by_id [DOMAIN(7): Testing; CONCEPT(7): Querying; TECH(8): pytest, httpx]
## @purpose Verify that a single category can be retrieved by its id and returns correct data.
## @uses auth_headers fixture, async_client fixture
## @complexity 4
@pytest.mark.asyncio
async def test_get_category_by_id(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    payload = {"name": "Зарплата", "type": "INCOME", "icon": "briefcase", "color": "#FFD700"}
    resp_create = await async_client.post(
        "/api/categories",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    cat_id = resp_create.json()["id"]

    resp = await async_client.get(f"/api/categories/{cat_id}")
    _print_ldd_trajectory(caplog, "GET_CATEGORY_BY_ID")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["id"] == cat_id
    assert data["name"] == "Зарплата"
    assert data["type"] == "INCOME"
# endregion TEST_test_get_category_by_id
