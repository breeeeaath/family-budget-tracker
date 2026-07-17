# region MODULE_CONTRACT [DOMAIN(8): Testing; CONCEPT(8): DataIntegrity, JournalEntry; TECH(9): pytest, httpx, LDD]
## @modulecontract
## @purpose Validate transaction creation with type‑category consistency enforcement, negative amount rejection, non‑existent category handling, and list endpoint with pagination, type filter, and date range filter. Every test outputs IMP:7‑10 telemetry.
## @scope POST /api/transactions, GET /api/transactions.
## @input Test HTTP requests via httpx AsyncClient.
## @output Assertion results + console‑printed LDD trajectories.
## @links [DEPENDS_ON(9): tests.conftest.async_client, tests.conftest.auth_headers; backend.app.routers.transactions; backend.app.routers.categories]
## @invariants
## - Transaction type MUST match category type, enforced with 422.
## - Missing category yields 404.
## - Non‑positive amount yields 422.
## - List endpoint returns newest‑first, supports pagination and filtering.
## @rationale
## Q: Why test type‑category mismatch separately?
## A: This is the most critical integrity guard. Allowing INCOME transactions on EXPENSE categories would silently corrupt analytics and balance calculations.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial transactions test suite.]
## @modulemap
## TEST 10[Create transaction — happy path] => test_create_transaction
## TEST 10[Type‑category mismatch → 422] => test_create_transaction_type_mismatch
## TEST 9[Non‑existent category → 404] => test_create_transaction_nonexistent_category
## TEST 9[Negative amount → 422] => test_create_transaction_negative_amount
## TEST 8[List with pagination] => test_list_transactions
## TEST 8[Filter by type] => test_filter_transactions_by_type
## TEST 8[Filter by date] => test_filter_transactions_by_date
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: test, transactions, create, type mismatch, 422, 404, pagination, filter, type, date, pytest, httpx, LDD telemetry, DECIMAL
# STRUCTURE: ▶ test_create_transaction → POST + cookie → 201 + verify fields → ☑; ▶ test_create_transaction_type_mismatch → INCOME tx on EXPENSE category → 422 → ☑; ▶ test_create_transaction_nonexistent_category → category_id=999 → 404 → ☑; ▶ test_create_transaction_negative_amount → amount=-50 → 422 → ☑; ▶ test_list_transactions → create 3 → GET with limit=2 → verify pagination → ☑; ▶ test_filter_transactions_by_type → GET ?type=EXPENSE → all are EXPENSE → ☑; ▶ test_filter_transactions_by_date → GET ?start_date&end_date → only in range → ☑

import logging
from decimal import Decimal

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


async def _create_category(client: AsyncClient, auth_headers: dict, name: str, cat_type: str) -> int:
    payload = {"name": name, "type": cat_type, "icon": "star", "color": "#FFFFFF"}
    resp = await client.post(
        "/api/categories",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    assert resp.status_code == 201, f"Failed to create category: {resp.text}"
    return resp.json()["id"]


# region TEST_test_create_transaction [DOMAIN(8): Testing; CONCEPT(8): DataIntegrity; TECH(9): pytest, httpx]
## @purpose Verify that an authenticated user can create a transaction against a matching‑type category and receive valid TransactionOut.
## @uses auth_headers, async_client
## @complexity 5
@pytest.mark.asyncio
async def test_create_transaction(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    cat_id = await _create_category(async_client, auth_headers, "Продукты", "EXPENSE")

    payload = {
        "amount": "150.50",
        "type": "EXPENSE",
        "category_id": cat_id,
        "note": "Покупка в магазине",
    }

    resp = await async_client.post(
        "/api/transactions",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "CREATE_TRANSACTION")

    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert Decimal(str(data["amount"])) == Decimal("150.50")
    assert data["type"] == "EXPENSE"
    assert data["category_id"] == cat_id
    assert data["note"] == "Покупка в магазине"
    assert data["id"] > 0
    assert data["user_id"] > 0

    found_log = False
    for record in caplog.records:
        if "[IMP:9][create_transaction][CREATED]" in record.message:
            found_log = True
            break
    assert found_log, "Critical LDD Error: missing [IMP:9][create_transaction][CREATED]"
# endregion TEST_test_create_transaction


# region TEST_test_create_transaction_type_mismatch [DOMAIN(9): Testing; CONCEPT(9): DataIntegrity; TECH(9): pytest, httpx]
## @purpose Verify that creating an INCOME transaction against an EXPENSE category is rejected with 422 and clear detail message.
## @uses auth_headers, async_client
## @complexity 4
@pytest.mark.asyncio
async def test_create_transaction_type_mismatch(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    cat_id = await _create_category(async_client, auth_headers, "Продукты", "EXPENSE")

    payload = {
        "amount": "100.00",
        "type": "INCOME",
        "category_id": cat_id,
    }

    resp = await async_client.post(
        "/api/transactions",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "TYPE_MISMATCH")

    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"
    assert "does not match" in resp.json()["detail"]

    found_log = False
    for record in caplog.records:
        if "[IMP:9][create_transaction][TYPE_MISMATCH]" in record.message:
            found_log = True
            break
    assert found_log, "Critical LDD Error: missing [IMP:9][create_transaction][TYPE_MISMATCH]"
# endregion TEST_test_create_transaction_type_mismatch


# region TEST_test_create_transaction_nonexistent_category [DOMAIN(7): Testing; CONCEPT(7): ErrorHandling; TECH(8): pytest, httpx]
## @purpose Verify that a transaction referencing a non‑existent category returns 404.
## @uses auth_headers, async_client
## @complexity 3
@pytest.mark.asyncio
async def test_create_transaction_nonexistent_category(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    payload = {
        "amount": "50.00",
        "type": "EXPENSE",
        "category_id": 99999,
    }

    resp = await async_client.post(
        "/api/transactions",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "NONEXISTENT_CATEGORY")

    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
# endregion TEST_test_create_transaction_nonexistent_category


# region TEST_test_create_transaction_negative_amount [DOMAIN(7): Testing; CONCEPT(7): Validation; TECH(8): pytest, httpx]
## @purpose Verify that a transaction with non‑positive amount is rejected with 422.
## @uses auth_headers, async_client
## @complexity 3
@pytest.mark.asyncio
async def test_create_transaction_negative_amount(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    payload = {
        "amount": "0",
        "type": "EXPENSE",
        "category_id": 1,
    }

    resp = await async_client.post(
        "/api/transactions",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "NEGATIVE_AMOUNT")

    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"
# endregion TEST_test_create_transaction_negative_amount


# region TEST_test_list_transactions [DOMAIN(7): Testing; CONCEPT(7): Querying; TECH(8): pytest, httpx]
## @purpose Verify the list endpoint returns paginated, newest‑first results for the authenticated user.
## @uses auth_headers, async_client
## @complexity 5
@pytest.mark.asyncio
async def test_list_transactions(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    cat_id = await _create_category(async_client, auth_headers, "Транспорт", "EXPENSE")

    for i in range(3):
        payload = {"amount": str(100 + i), "type": "EXPENSE", "category_id": cat_id, "note": f"tx{i}"}
        resp = await async_client.post(
            "/api/transactions",
            json=payload,
            headers={"Cookie": auth_headers["token_part"]},
        )
        assert resp.status_code == 201, f"Failed to create tx{i}: {resp.text}"

    resp = await async_client.get(
        "/api/transactions?limit=2&offset=0",
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "LIST_TRANSACTIONS")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2

    assert data[0]["amount"] == "102.00"
    assert data[1]["amount"] == "101.00"
# endregion TEST_test_list_transactions


# region TEST_test_filter_transactions_by_type [DOMAIN(7): Testing; CONCEPT(7): Querying; TECH(8): pytest, httpx]
## @purpose Verify type filter returns only transactions of the specified type.
## @uses auth_headers, async_client
## @complexity 4
@pytest.mark.asyncio
async def test_filter_transactions_by_type(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    exp_cat_id = await _create_category(async_client, auth_headers, "Еда", "EXPENSE")
    inc_cat_id = await _create_category(async_client, auth_headers, "Зарплата", "INCOME")

    await async_client.post(
        "/api/transactions",
        json={"amount": "200.00", "type": "EXPENSE", "category_id": exp_cat_id},
        headers={"Cookie": auth_headers["token_part"]},
    )
    await async_client.post(
        "/api/transactions",
        json={"amount": "5000.00", "type": "INCOME", "category_id": inc_cat_id},
        headers={"Cookie": auth_headers["token_part"]},
    )

    resp = await async_client.get(
        "/api/transactions?type=EXPENSE",
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "FILTER_BY_TYPE")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["type"] == "EXPENSE"
    assert Decimal(str(data[0]["amount"])) == Decimal("200.00")
# endregion TEST_test_filter_transactions_by_type


# region TEST_test_filter_transactions_by_date [DOMAIN(7): Testing; CONCEPT(7): Querying; TECH(8): pytest, httpx]
## @purpose Verify date range filter returns only transactions within the specified interval.
## @uses auth_headers, async_client
## @complexity 4
@pytest.mark.asyncio
async def test_filter_transactions_by_date(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    cat_id = await _create_category(async_client, auth_headers, "Развлечения", "EXPENSE")

    from datetime import date
    today_str = date.today().isoformat()

    payload = {"amount": "333.33", "type": "EXPENSE", "category_id": cat_id}
    resp_create = await async_client.post(
        "/api/transactions",
        json=payload,
        headers={"Cookie": auth_headers["token_part"]},
    )
    assert resp_create.status_code == 201

    resp = await async_client.get(
        f"/api/transactions?start_date={today_str}&end_date={today_str}",
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "FILTER_BY_DATE")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert Decimal(str(data[0]["amount"])) == Decimal("333.33")
# endregion TEST_test_filter_transactions_by_date
