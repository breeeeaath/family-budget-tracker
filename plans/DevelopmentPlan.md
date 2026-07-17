$START_DEV_PLAN

**PURPOSE:** Пошаговый план реализации PWA «Wallet» — персональный финансовый трекер (FastAPI + React + PostgreSQL) для двух пользователей.

---

### 1. Draft Code Graph

```xml
<KnowledgeGraph>
  <Wallet_1_0_0_Info TYPE="PROJECT_INFO">
    <keywords>FinanceTracker, PWA, FastAPI, React, PostgreSQL, JWT, DECIMAL</keywords>
    <annotation>Personal finance PWA for 2 users. Monorepo: backend (FastAPI+PostgreSQL) + frontend (React+Vite+ReactQuery). Caddy as reverse proxy with auto-SSL. DECIMAL(12,2) for all money fields.</annotation>
    <BusinessScenarios>
      <Scenario NAME="AddTransaction">User -> Open PWA -> Enter amount+category -> Optimistic UI update -> POST /transactions -> Validate DECIMAL+type consistency -> Return TransactionOut</Scenario>
      <Scenario NAME="DashboardView">User -> Open Dashboard -> GET /analytics/summary + /analytics/by-category -> Render balance+pie chart</Scenario>
      <Scenario NAME="Login">User -> Enter credentials -> POST /auth/login -> Set HttpOnly JWT cookie -> Redirect to Dashboard</Scenario>
    </BusinessScenarios>
  </Wallet_1_0_0_Info>

  <backend_app_database_py FILE="backend/app/database.py" TYPE="INFRASTRUCTURE_MODULE">
    <annotation>Async SQLAlchemy engine + session factory for PostgreSQL via asyncpg.</annotation>
  </backend_app_database_py>

  <backend_app_config_py FILE="backend/app/config.py" TYPE="INFRASTRUCTURE_MODULE">
    <annotation>Pydantic BaseSettings: DATABASE_URL, SECRET_KEY, JWT_ALGORITHM.</annotation>
  </backend_app_config_py>

  <backend_app_models_py FILE="backend/app/models.py" TYPE="DATA_MODEL_MODULE">
    <keywords>ORM, SQLAlchemy, DECIMAL, ENUM</keywords>
    <annotation>User, Category, Transaction ORM models with DECIMAL(12,2) for amount.</annotation>
    <User_CLASS NAME="User" TYPE="SQLALCHEMY_MODEL">
      <annotation>id, name, password_hash</annotation>
    </User_CLASS>
    <Category_CLASS NAME="Category" TYPE="SQLALCHEMY_MODEL">
      <annotation>id, name, type(ENUM), icon, color</annotation>
    </Category_CLASS>
    <Transaction_CLASS NAME="Transaction" TYPE="SQLALCHEMY_MODEL">
      <annotation>id, amount(DECIMAL), type(ENUM), category_id(FK), user_id(FK), created_at, note</annotation>
    </Transaction_CLASS>
  </backend_app_models_py>

  <backend_app_schemas_py FILE="backend/app/schemas.py" TYPE="DTO_MODULE">
    <annotation>Pydantic models: TransactionType(str,Enum), CategoryOut, TransactionCreate, TransactionOut, DashboardSummaryOut, CategoryStatOut, TokenResponse.</annotation>
  </backend_app_schemas_py>

  <backend_app_auth_py FILE="backend/app/auth.py" TYPE="AUTH_MODULE">
    <keywords>JWT, bcrypt, passlib, python-jose</keywords>
    <hash_password_FUNC NAME="hash_password" TYPE="AUTH_UTILITY">
      <annotation>bcrypt hash via passlib.</annotation>
    </hash_password_FUNC>
    <verify_password_FUNC NAME="verify_password" TYPE="AUTH_UTILITY">
      <annotation>Verify plain password against hash.</annotation>
    </verify_password_FUNC>
    <create_access_token_FUNC NAME="create_access_token" TYPE="AUTH_UTILITY">
      <annotation>JWT with user_id sub claim, 30-day expiry.</annotation>
    </create_access_token_FUNC>
    <decode_access_token_FUNC NAME="decode_access_token" TYPE="AUTH_UTILITY">
      <annotation>Decode and validate JWT, return user_id or raise 401.</annotation>
    </decode_access_token_FUNC>
  </backend_app_auth_py>

  <backend_app_dependencies_py FILE="backend/app/dependencies.py" TYPE="MIDDLEWARE_MODULE">
    <annotation>FastAPI Depends: get_db (async session), get_current_user (cookie -> user_id).</annotation>
    <get_db_FUNC NAME="get_db" TYPE="DEPENDENCY">
      <annotation>Yield async SQLAlchemy session.</annotation>
    </get_db_FUNC>
    <get_current_user_FUNC NAME="get_current_user" TYPE="DEPENDENCY">
      <annotation>Extract JWT from cookie, decode, return user_id.</annotation>
    </get_current_user_FUNC>
  </backend_app_dependencies_py>

  <backend_app_routers_auth_py FILE="backend/app/routers/auth.py" TYPE="API_ROUTER">
    <annotation>POST /auth/login, POST /auth/register.</annotation>
  </backend_app_routers_auth_py>

  <backend_app_routers_transactions_py FILE="backend/app/routers/transactions.py" TYPE="API_ROUTER">
    <annotation>POST /transactions (create with type-category consistency check), GET /transactions (filtered list).</annotation>
    <create_transaction_FUNC NAME="create_transaction" TYPE="API_ENDPOINT">
      <CrossLinks>
        <Link TARGET="backend_app_dependencies_py_get_current_user_FUNC" TYPE="CALLS_FUNCTION" />
        <Link TARGET="backend_app_dependencies_py_get_db_FUNC" TYPE="CALLS_FUNCTION" />
      </CrossLinks>
    </create_transaction_FUNC>
    <get_transactions_FUNC NAME="get_transactions" TYPE="API_ENDPOINT">
      <CrossLinks>
        <Link TARGET="backend_app_dependencies_py_get_current_user_FUNC" TYPE="CALLS_FUNCTION" />
      </CrossLinks>
    </get_transactions_FUNC>
  </backend_app_routers_transactions_py>

  <backend_app_routers_categories_py FILE="backend/app/routers/categories.py" TYPE="API_ROUTER">
    <annotation>GET /categories (list all), POST /categories (create).</annotation>
  </backend_app_routers_categories_py>

  <backend_app_routers_analytics_py FILE="backend/app/routers/analytics.py" TYPE="API_ROUTER">
    <annotation>GET /analytics/summary (dashboard aggregates), GET /analytics/by-category (pie chart data).</annotation>
    <get_dashboard_summary_FUNC NAME="get_dashboard_summary" TYPE="API_ENDPOINT">
      <CrossLinks>
        <Link TARGET="backend_app_dependencies_py_get_current_user_FUNC" TYPE="CALLS_FUNCTION" />
      </CrossLinks>
    </get_dashboard_summary_FUNC>
    <get_stats_by_category_FUNC NAME="get_stats_by_category" TYPE="API_ENDPOINT">
      <CrossLinks>
        <Link TARGET="backend_app_dependencies_py_get_current_user_FUNC" TYPE="CALLS_FUNCTION" />
      </CrossLinks>
    </get_stats_by_category_FUNC>
  </backend_app_routers_analytics_py>

  <backend_app_main_py FILE="backend/app/main.py" TYPE="APP_ENTRY">
    <annotation>FastAPI app init, CORS middleware, include routers, lifespan (create tables).</annotation>
  </backend_app_main_py>

  <frontend_src_api_client_js FILE="frontend/src/api/client.js" TYPE="API_LAYER">
    <annotation>Axios instance with base URL, cookie credentials. Wrappers: api.post, api.get.</annotation>
  </frontend_src_api_client_js>

  <frontend_src_hooks_useAuth_js FILE="frontend/src/hooks/useAuth.js" TYPE="DATA_HOOK">
    <annotation>React Query hooks: POST /auth/login, current user state.</annotation>
  </frontend_src_hooks_useAuth_js>

  <frontend_src_hooks_useTransactions_js FILE="frontend/src/hooks/useTransactions.js" TYPE="DATA_HOOK">
    <annotation>React Query hooks with optimistic updates: useAddTransaction, useTransactions.</annotation>
  </frontend_src_hooks_useTransactions_js>

  <frontend_src_hooks_useAnalytics_js FILE="frontend/src/hooks/useAnalytics.js" TYPE="DATA_HOOK">
    <annotation>React Query hooks: useDashboardSummary, useCategoryStats.</annotation>
  </frontend_src_hooks_useAnalytics_js>

  <frontend_src_pages_Dashboard_jsx FILE="frontend/src/pages/Dashboard.jsx" TYPE="UI_PAGE">
    <annotation>Summary cards (balance, today, month) + PieChart (Recharts).</annotation>
    <CrossLinks>
      <Link TARGET="frontend_src_hooks_useAnalytics_js" TYPE="CALLS_FUNCTION" />
    </CrossLinks>
  </frontend_src_pages_Dashboard_jsx>

  <frontend_src_pages_AddTransaction_jsx FILE="frontend/src/pages/AddTransaction.jsx" TYPE="UI_PAGE">
    <annotation>Form: amount, type toggle, category picker, note. Optimistic update on submit.</annotation>
    <CrossLinks>
      <Link TARGET="frontend_src_hooks_useTransactions_js" TYPE="CALLS_FUNCTION" />
    </CrossLinks>
  </frontend_src_pages_AddTransaction_jsx>

  <frontend_src_pages_History_jsx FILE="frontend/src/pages/History.jsx" TYPE="UI_PAGE">
    <annotation>Transaction list with date/category filters. Infinite scroll or load more.</annotation>
    <CrossLinks>
      <Link TARGET="frontend_src_hooks_useTransactions_js" TYPE="CALLS_FUNCTION" />
    </CrossLinks>
  </frontend_src_pages_History_jsx>

  <frontend_src_App_jsx FILE="frontend/src/App.jsx" TYPE="UI_ROOT">
    <annotation>React Router: /login, /dashboard, /add, /history. Auth guard.</annotation>
  </frontend_src_App_jsx>

  <ProjectCrossLinks TYPE="MODULE_INTERACTIONS_OVERVIEW">
    <Link TARGET="frontend_src_api_client_js" TYPE="HTTP_CALLS_API" />
    <Link TARGET="backend_app_main_py" TYPE="ORCHESTRATES_FLOW" />
  </ProjectCrossLinks>
</KnowledgeGraph>
```

---

### 2. Step-by-step Data Flow

#### Flow 1: Добавление транзакции (Optimistic Update)
1. Пользователь заполняет форму в `AddTransaction.jsx`: amount=250.00, category_id=3 (Продукты/EXPENSE), note="Пятёрочка"
2. `useAddTransaction` hook вызывает `queryClient.setQueryData` — вставляет новую запись в кеш ленты и пересчитывает кеш дашборда
3. Параллельно отправляется `POST /transactions` с телом `TransactionCreate`
4. FastAPI `create_transaction`: извлекает user_id из JWT-cookie, открывает async-сессию БД
5. `Category` загружается по `category_id` → проверка `category.type == tx.type` (422 при несовпадении)
6. `Transaction` создаётся: amount сохраняется как DECIMAL, `created_at=tx.created_at` (переданное или utcnow)
7. `db.commit()` → возврат `TransactionOut`
8. При успехе: React Query инвалидирует `['transactions']` и `['dashboard-summary']` для серверной синхронизации
9. При ошибке: `onError` откатывает кеш через `queryClient.setQueryData` к предыдущему снимку

#### Flow 2: Дашборд (Аналитика)
1. `Dashboard.jsx` монтируется → `useDashboardSummary` → `GET /analytics/summary`
2. FastAPI выполняет один SQL-запрос:
   ```sql
   SELECT
     COALESCE(SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END), 0) AS total_balance,
     COALESCE(SUM(CASE WHEN type='EXPENSE' AND DATE(created_at)=CURRENT_DATE THEN amount ELSE 0 END), 0) AS expense_today,
     COALESCE(SUM(CASE WHEN type='EXPENSE' AND DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS expense_this_month,
     COALESCE(SUM(CASE WHEN type='INCOME' AND DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS income_this_month
   FROM transactions WHERE user_id = $1
   ```
3. `DashboardSummaryOut` возвращается → отображается в карточках
4. Параллельно `useCategoryStats` → `GET /analytics/by-category?start_date=...&end_date=...&type=EXPENSE`
5. SQL:
   ```sql
   SELECT c.id, c.name, c.icon, SUM(t.amount) as total_amount
   FROM transactions t JOIN categories c ON t.category_id = c.id
   WHERE t.user_id = $1 AND t.type = $2 AND t.created_at BETWEEN $3 AND $4
   GROUP BY c.id, c.name, c.icon ORDER BY total_amount DESC
   ```
6. `List[CategoryStatOut]` → `<PieChart>` (Recharts) — доли категорий в расходах

#### Flow 3: Авторизация
1. `Login.jsx` → форма имя + пароль → `POST /auth/login`
2. FastAPI: загружает User по name → `verify_password(plain, hash)` → ошибка 401 при несовпадении
3. `create_access_token(data={"sub": str(user.id)})` → JWT с expires_delta=30 дней
4. `response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="lax", max_age=86400*30)`
5. Фронтенд: `withCredentials: true` на axios → cookie отправляется автоматически
6. Все защищённые эндпоинты: `get_current_user` → `request.cookies.get("access_token")` → decode → user_id

---

### 3. Acceptance Criteria

- [ ] **AC-01:** `POST /transactions` создаёт запись, проверяет type-консистентность с категорией (422 при mismatch).
- [ ] **AC-02:** `GET /analytics/summary` возвращает корректный баланс = доходы - расходы для авторизованного пользователя.
- [ ] **AC-03:** `GET /analytics/by-category` возвращает группировку по категориям с суммой и названием.
- [ ] **AC-04:** `POST /auth/login` устанавливает HttpOnly cookie с JWT, возвращает `{user_id, name}`.
- [ ] **AC-05:** Все защищённые эндпоинты возвращают 401 без валидного токена.
- [ ] **AC-06:** Все денежные поля хранятся и возвращаются как DECIMAL (строка с 2 знаками в JSON).
- [ ] **AC-07:** Фронтенд выполняет Optimistic Update при добавлении транзакции и откатывает при ошибке.
- [ ] **AC-08:** PWA собирается через `vite build` и раздаётся Caddy как статика.
- [ ] **AC-09:** Все backend-модули покрыты pytest-тестами с LDD-телеметрией (вывод IMP:7-10 в консоль).
- [ ] **AC-10:** Все бэкенд-файлы содержат Doxygen-совместимую семантическую разметку (`# region`, `## @purpose`, `# GREP_SUMMARY:`, `# STRUCTURE:`).
- [ ] **AC-11:** Doxyfile настроен, `doxygen Doxyfile` генерирует XML без ошибок.

---

### 4. Implementation Order (Feature Slices)

| Slice | Модули | Тесты |
|-------|--------|-------|
| **S1: Backend Core** | `config.py`, `database.py`, `models.py`, `schemas.py`, `auth.py`, `dependencies.py`, `main.py`, `routers/auth.py` | `tests/conftest.py`, `tests/test_auth.py` |
| **S2: Backend Business** | `routers/categories.py`, `routers/transactions.py`, `routers/analytics.py` | `tests/test_categories.py`, `tests/test_transactions.py`, `tests/test_analytics.py` |
| **S3: Frontend** | `api/client.js`, `hooks/`, `pages/`, `components/`, `App.jsx`, `main.jsx` | Manual verification (PWA) |
| **S4: Infra** | `Doxyfile`, `docker-compose.yml`, `Caddyfile`, `requirements.txt` | `doxygen Doxyfile` |

$END_DEV_PLAN
