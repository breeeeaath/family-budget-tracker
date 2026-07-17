# region MODULE_CONTRACT [DOMAIN(8): Testing; CONCEPT(8): Analytics, Aggregation; TECH(9): pytest, httpx, LDD]
## @modulecontract
## @purpose Validate analytics endpoints: dashboard summary (single‑query aggregation producing balance, today/month totals) and per‑category breakdown. Every test outputs IMP:7‑10 telemetry.
## @scope GET /api/analytics/summary, GET /api/analytics/by-category.
## @input Test HTTP requests via httpx AsyncClient.
## @output Assertion results + console‑printed LDD trajectories.
## @links [DEPENDS_ON(9): tests.conftest.async_client, tests.conftest.auth_headers; backend.app.routers.analytics; backend.app.routers.transactions; backend.app.routers.categories]
## @invariants
## - total_balance = SUM(INCOME) - SUM(EXPENSE).
## - expense_today >= 0 and expense_this_month >= expense_today.
## - by‑category returns correct per‑category aggregation with non‑zero totals.
## @rationale
## Q: Why verify expense_today <= expense_this_month?
## A: Today is always a subset of the current month. This invariant catches SQL date‑filter bugs (e.g., unix timestamp vs date mismatch).
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial analytics test suite.]
## @modulemap
## TEST 10[Dashboard summary aggregation check] => test_dashboard_summary
## TEST 9[Per‑category stats grouping] => test_stats_by_category
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: test, analytics, dashboard, summary, by-category, total_balance, expense_today, expense_this_month, CategoryStatOut, GROUP BY, pytest, httpx, LDD telemetry
# STRUCTURE: ▶ test_dashboard_summary → create income + expense tx → GET /api/analytics/summary → verify total_balance & invariants → ☑; ▶ test_stats_by_category → create tx in 2 categories → GET /api/analytics/by-category → verify grouping → ☑

import logging
from decimal import Decimal
from datetime import date

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


async def _create_category(client: AsyncClient, auth: dict, name: str, cat_type: str) -> int:
    payload = {"name": name, "type": cat_type, "icon": "star", "color": "#FFFFFF"}
    resp = await client.post("/api/categories", json=payload, headers={"Cookie": auth["token_part"]})
    if resp.status_code != 201:
        raise RuntimeError(f"Category creation failed: {resp.status_code} {resp.text}")
    return resp.json()["id"]


async def _create_transaction(client: AsyncClient, auth: dict, amount: str, tx_type: str, cat_id: int):
    payload = {"amount": amount, "type": tx_type, "category_id": cat_id}
    resp = await client.post("/api/transactions", json=payload, headers={"Cookie": auth["token_part"]})
    if resp.status_code != 201:
        raise RuntimeError(f"Transaction creation failed: {resp.status_code} {resp.text}")
    return resp.json()


# region TEST_test_dashboard_summary [DOMAIN(9): Testing; CONCEPT(8): Analytics; TECH(9): pytest, httpx]
## @purpose Create multiple income and expense transactions, then verify dashboard summary returns correct total_balance and invariants (expense_today <= expense_this_month, non‑negative values).
## @uses auth_headers, async_client
## @complexity 6
@pytest.mark.asyncio
async def test_dashboard_summary(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    inc_cat = await _create_category(async_client, auth_headers, "Доход", "INCOME")
    exp_cat = await _create_category(async_client, auth_headers, "Расход", "EXPENSE")

    total_income = Decimal("0")
    total_expense = Decimal("0")

    income_amounts = ["1000.00", "2000.00", "500.00"]
    for amt in income_amounts:
        await _create_transaction(async_client, auth_headers, amt, "INCOME", inc_cat)
        total_income += Decimal(amt)

    expense_amounts = ["300.00", "150.00"]
    for amt in expense_amounts:
        await _create_transaction(async_client, auth_headers, amt, "EXPENSE", exp_cat)
        total_expense += Decimal(amt)

    resp = await async_client.get(
        "/api/analytics/summary",
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "DASHBOARD_SUMMARY")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    expected_balance = total_income - total_expense
    assert Decimal(str(data["total_balance"])) == expected_balance, f"Balance mismatch: {data['total_balance']} != {expected_balance}"
    assert Decimal(str(data["expense_today"])) >= 0, "expense_today should be non‑negative"
    assert Decimal(str(data["expense_this_month"])) >= Decimal(str(data["expense_today"])), \
        f"expense_this_month ({data['expense_this_month']}) should be >= expense_today ({data['expense_today']})"
    assert Decimal(str(data["income_this_month"])) >= 0, "income_this_month should be non‑negative"

    found_log = False
    for record in caplog.records:
        if "[IMP:9][dashboard_summary][RESULT]" in record.message:
            found_log = True
            break
    assert found_log, "Critical LDD Error: missing [IMP:9][dashboard_summary][RESULT]"
# endregion TEST_test_dashboard_summary


# region TEST_test_stats_by_category [DOMAIN(9): Testing; CONCEPT(8): Analytics; TECH(9): pytest, httpx]
## @purpose Create transactions in two different EXPENSE categories and verify the by‑category endpoint correctly groups and sums amounts per category, ordered by total_amount DESC.
## @uses auth_headers, async_client
## @complexity 6
@pytest.mark.asyncio
async def test_stats_by_category(async_client: AsyncClient, auth_headers: dict, caplog):
    caplog.set_level(logging.INFO)

    cat1 = await _create_category(async_client, auth_headers, "Продукты", "EXPENSE")
    cat2 = await _create_category(async_client, auth_headers, "Транспорт", "EXPENSE")

    await _create_transaction(async_client, auth_headers, "200.00", "EXPENSE", cat1)
    await _create_transaction(async_client, auth_headers, "150.00", "EXPENSE", cat1)
    await _create_transaction(async_client, auth_headers, "500.00", "EXPENSE", cat2)

    today_str = date.today().isoformat()

    resp = await async_client.get(
        f"/api/analytics/by-category?start_date={today_str}&end_date={today_str}&type=EXPENSE",
        headers={"Cookie": auth_headers["token_part"]},
    )
    _print_ldd_trajectory(caplog, "STATS_BY_CATEGORY")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2

    assert data[0]["category_name"] == "Транспорт"
    assert Decimal(str(data[0]["total_amount"])) == Decimal("500.00")

    assert data[1]["category_name"] == "Продукты"
    assert Decimal(str(data[1]["total_amount"])) == Decimal("350.00")

    for item in data:
        assert "category_id" in item
        assert "icon" in item
        assert "color" in item
# endregion TEST_test_stats_by_category
