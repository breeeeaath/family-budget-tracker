# Test Guide: Slice S2 — Categories, Transactions, Analytics

## Overview
Test suite for the business logic layer of the Wallet backend: category CRUD, transaction journal with type‑consistency enforcement, and dashboard/analytics aggregation endpoints.
All tests use an isolated SQLite in‑memory database — no external PostgreSQL required.

## Prerequisites
```bash
pip install -r backend/requirements.txt
pip install aiosqlite pydantic-settings
```

## Run command
```bash
python -m pytest tests/test_categories.py tests/test_transactions.py tests/test_analytics.py -s -v
```

## Test Cases

### Categories (`tests/test_categories.py`)

#### 1. test_create_category
- **Input**: POST `/api/categories` `{name, type=EXPENSE, icon, color}` with auth cookie
- **Expected**: 201 Created with CategoryOut. Fields match input.
- **Key LDD markers**:
  - `[IMP:9][create_category][CREATE]` — creation attempt logged
  - `[IMP:9][create_category][CREATED]` — confirmation with id

#### 2. test_list_categories
- **Input**: GET `/api/categories` (no auth)
- **Expected**: 200 OK, non‑empty list, sorted alphabetically by name
- **Key LDD markers**: `[IMP:5][list_categories]` (trace level)

#### 3. test_get_category_by_id
- **Input**: Create category → GET `/api/categories/{id}`
- **Expected**: 200 OK, returned name matches created category

### Transactions (`tests/test_transactions.py`)

#### 4. test_create_transaction
- **Input**: Create EXPENSE category → POST `/api/transactions` with matching EXPENSE type + auth cookie
- **Expected**: 201 Created, TransactionOut with correct amount (Decimal), type, category_id, user_id
- **Key LDD markers**:
  - `[IMP:9][create_transaction][ATTEMPT]` — creation attempt
  - `[IMP:9][create_transaction][CREATED]` — successful creation

#### 5. test_create_transaction_type_mismatch
- **Input**: Create EXPENSE category → POST `/api/transactions` with INCOME type
- **Expected**: 422 Unprocessable Entity, detail contains "does not match"
- **Key LDD markers**:
  - `[IMP:9][create_transaction][TYPE_MISMATCH]` — consistency violation detected

#### 6. test_create_transaction_nonexistent_category
- **Input**: POST `/api/transactions` with category_id=99999
- **Expected**: 404 Not Found
- **Key LDD markers**: `[IMP:8][create_transaction][CATEGORY_404]`

#### 7. test_create_transaction_negative_amount
- **Input**: POST `/api/transactions` with amount="0"
- **Expected**: 422 Unprocessable Entity
- **Key LDD markers**: Pydantic validation (built‑in)

#### 8. test_list_transactions
- **Input**: Create 3 transactions → GET `/api/transactions?limit=2&offset=0`
- **Expected**: 200 OK, returns exactly 2 items, newest first (created_at DESC)
- **Key LDD markers**: `[IMP:9][get_current_user][AUTH_OK]` on auth

#### 9. test_filter_transactions_by_type
- **Input**: Create 1 EXPENSE + 1 INCOME transaction → GET `/api/transactions?type=EXPENSE`
- **Expected**: 200 OK, returns only 1 EXPENSE transaction
- **Key LDD markers**: `[IMP:5][list_transactions][FILTER]`

#### 10. test_filter_transactions_by_date
- **Input**: Create 1 transaction → GET `/api/transactions?start_date={today}&end_date={today}`
- **Expected**: 200 OK, includes the created transaction
- **Key LDD markers**: `[IMP:5][list_transactions][FILTER]`

### Analytics (`tests/test_analytics.py`)

#### 11. test_dashboard_summary
- **Input**: Create 3 INCOME (1000+2000+500=3500) + 2 EXPENSE (300+150=450) transactions → GET `/api/analytics/summary`
- **Expected**: 200 OK, total_balance=3050.00, expense_today >= 0, expense_this_month >= expense_today
- **Key LDD markers**:
  - `[IMP:9][dashboard_summary][RESULT]` — aggregated values logged with user_id

#### 12. test_stats_by_category
- **Input**: Create 2 EXPENSE transactions in "Продукты" (200+150=350) + 1 in "Транспорт" (500) → GET `/api/analytics/by-category?start_date={today}&end_date={today}&type=EXPENSE`
- **Expected**: 200 OK, returns 2 items ordered by total_amount DESC: "Транспорт"=500, "Продукты"=350
- **Key LDD markers**:
  - `[IMP:8][stats_by_category][QUERY]` — aggregation execution
  - `[IMP:8][stats_by_category][RESULT]` — count of returned groups

## Anti-Loop Protocol
- Counter stored in `tests/.test_counter.json`
- `pytest_sessionstart`: prints warning if count > 0 with checklist
- `pytest_sessionfinish`: resets to 0 on 100% pass, increments on failure
- Attempt 1-2: prints CHECKLIST
- Attempt 3: suggests external help
- Attempt 4: warns about looping risk
- Attempt 5+: CRITICAL ERROR — escalation needed

## Infrastructure Notes
- Test DB: SQLite `:memory:` via `sqlite+aiosqlite://`
- Auth: bcrypt + python-jose HS256 JWT in HttpOnly cookies
- HTTP client: httpx AsyncClient with ASGITransport
- Dependency override: `get_db` replaced with SQLite session maker
- Lifespan disabled: `app.router.lifespan_context = None`

## Slice S1 Tests (still active)
```bash
python -m pytest tests/test_auth.py -s -v
```
- test_register_and_login: full auth flow
- test_login_wrong_password: credential rejection
- test_protected_endpoint_without_token: auth guard
- test_health_check: infrastructure check
