$START_DOC_NAME

**PURPOSE:** План рефакторинга приложения «Трекер Трат» (Family Budget) с разделением слоёв, добавлением семантической разметки, полным покрытием тестами и настройкой Doxygen-документации.
**SCOPE:** Бэкенд (Express + SQLite), фронтенд (React + Tailwind), тестовая инфраструктура (vitest), документация (Doxygen).
**KEYWORDS:** DOMAIN(Budget): ExpenseTracking, FamilyFinance; CONCEPT(Architecture): LayerIsolation, DI, SemanticMarkup; TECH(Backend): Express, better-sqlite3, TypeScript; TECH(Frontend): React19, Tailwind4, Vite; TECH(Testing): vitest, supertest, LDD; TECH(Docs): Doxygen.

$START_DOCUMENT_PLAN
### Document Plan
<!--
AI-Agent: Generate this entire block before expanding sections.
Format: TYPE [Description] => [Artifact_ID]
-->

**SECTION_GOALS:**
- GOAL [Layer-isolated architecture with backend/frontend separation] => G_LAYER_ISOLATION
- GOAL [100% test coverage of backend with LDD telemetry] => G_TEST_COVERAGE
- GOAL [Full Doxygen+GREP semantic markup on all files] => G_SEMANTIC_MARKUP
- GOAL [Zero-context survival: any file readable by isolated agent] => G_ZERO_CONTEXT
- GOAL [Backward compatibility: existing API and UI unchanged] => G_BACKWARD_COMPAT

**SECTION_USE_CASES:**
- USE_CASE [Agent navigates codebase via grep GREP_SUMMARY|STRUCTURE] => UC_GREP_NAV
- USE_CASE [Agent debugs via LDD log trace IMP:7-10 in test output] => UC_LDD_DEBUG
- USE_CASE [User adds/deletes expense via UI — behavior unchanged] => UC_USER_CRUD

$END_DOCUMENT_PLAN

$START_ARCHITECTURE_OVERVIEW
### Архитектурный обзор

$START_DRAFT_CODE_GRAPH
#### 1. Draft Code Graph (XML)

```xml
<KnowledgeGraph>
  <WalletBudget_1_0_0_Info TYPE="PROJECT_INFO">
    <keywords>Budget, ExpenseTracking, FamilyFinance, React, Express, SQLite, LDD</keywords>
    <annotation>Семейный трекер трат: PWA на React + Express + SQLite. Рефакторинг с разделением слоёв и семантической разметкой.</annotation>
    <BusinessScenarios>
      <Scenario NAME="AddExpense">User -> Enter Amount+Description -> Submit Form -> POST /api/expenses -> Insert DB -> Refresh List</Scenario>
      <Scenario NAME="DeleteExpense">User -> Click Delete -> DELETE /api/expenses/:id -> Remove from DB -> Refresh List</Scenario>
      <Scenario NAME="ViewExpenses">User -> Open App -> GET /api/expenses -> Render List + Total</Scenario>
      <Scenario NAME="AgentDebugs">Agent -> Read caplog IMP:7-10 -> Trace to BLOCK_NAME -> Jump to Code</Scenario>
    </BusinessScenarios>
  </WalletBudget_1_0_0_Info>

  <server_ts FILE="server.ts" TYPE="ENTRY_POINT_MODULE">
    <annotation>Точка входа Express-сервера. Создаёт экземпляры db, service, controller. Подключает Vite middleware.</annotation>
  </server_ts>

  <db_ts FILE="src/backend/db.ts" TYPE="DATABASE_MODULE">
    <annotation>Подключение к SQLite, инициализация схемы expenses. Экспорт функции createDb().</annotation>
    <createDb_FUNC NAME="createDb" TYPE="IS_FUNCTION_OF_MODULE">
      <annotation>Создаёт соединение с better-sqlite3, выполняет CREATE TABLE IF NOT EXISTS, возвращает Database.</annotation>
    </createDb_FUNC>
  </db_ts>

  <expense_service_ts FILE="src/backend/expense_service.ts" TYPE="BUSINESS_LOGIC_MODULE">
    <annotation>Бизнес-логика расходов: CRUD-операции, валидация. Принимает db: Database через конструктор/фабрику.</annotation>
    <ExpenseService_CLASS NAME="ExpenseService" TYPE="IS_CLASS_OF_MODULE">
      <annotation>Сервис расходов. Инкапсулирует все SQL-операции и валидацию.</annotation>
      <getAll_METHOD NAME="getAll" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Возвращает последние 50 расходов для workspace_id.</annotation>
        <CrossLinks>
          <Link TARGET="db_ts" TYPE="READS_DATA_FROM" />
        </CrossLinks>
      </getAll_METHOD>
      <create_METHOD NAME="create" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Валидирует и вставляет новый расход. Возвращает созданную запись.</annotation>
      </create_METHOD>
      <delete_METHOD NAME="delete" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Удаляет расход по id с проверкой workspace_id.</annotation>
      </delete_METHOD>
      <getTotal_METHOD NAME="getTotal" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Возвращает сумму всех расходов.</annotation>
      </getTotal_METHOD>
    </ExpenseService_CLASS>
  </expense_service_ts>

  <expense_controller_ts FILE="src/backend/expense_controller.ts" TYPE="CONTROLLER_MODULE">
    <annotation>Express route handlers. Тонкая прослойка: парсинг req, вызов сервиса, форматирование res.</annotation>
    <createRouter_FUNC NAME="createRouter" TYPE="IS_FUNCTION_OF_MODULE">
      <annotation>Создаёт Express Router с маршрутами GET/POST/DELETE /api/expenses.</annotation>
      <CrossLinks>
        <Link TARGET="expense_service_ts" TYPE="CALLS_CLASS" />
      </CrossLinks>
    </createRouter_FUNC>
  </expense_controller_ts>

  <useExpenses_ts FILE="src/frontend/hooks/useExpenses.ts" TYPE="FRONTEND_HOOK_MODULE">
    <annotation>Кастомный React-хук: инкапсулирует fetch-логику к /api/expenses.</annotation>
    <useExpenses_FUNC NAME="useExpenses" TYPE="IS_FUNCTION_OF_MODULE">
      <annotation>Управляет состоянием: expenses, isLoading. Экспортирует fetchExpenses, addExpense, deleteExpense.</annotation>
      <CrossLinks>
        <Link TARGET="expense_controller_ts" TYPE="CALLS_API" />
      </CrossLinks>
    </useExpenses_FUNC>
  </useExpenses_ts>

  <App_tsx FILE="src/App.tsx" TYPE="FRONTEND_UI_MODULE">
    <annotation>Главный UI-компонент. Чистая презентация — использует хук useExpenses.</annotation>
    <CrossLinks>
      <Link TARGET="useExpenses_ts" TYPE="CALLS_FUNCTION" />
    </CrossLinks>
  </App_tsx>

  <ProjectCrossLinks TYPE="MODULE_INTERACTIONS_OVERVIEW">
    <Link TARGET="server_ts" TYPE="ORCHESTRATES_FLOW" />
    <Link TARGET="expense_controller_ts" TYPE="ROUTES_REQUESTS" />
    <Link TARGET="expense_service_ts" TYPE="HANDLES_BUSINESS_LOGIC" />
    <Link TARGET="db_ts" TYPE="PROVIDES_PERSISTENCE" />
  </ProjectCrossLinks>
</KnowledgeGraph>
```

$END_DRAFT_CODE_GRAPH

$START_DATA_FLOW
#### 2. Step-by-step Data Flow

**Сценарий добавления расхода (AddExpense):**
1. Пользователь вводит `amount`, `description` в форму → React-стейт `useExpenses`
2. Сабмит формы → `handleSubmit()` → вызывает `addExpense(amount, description)` из хука
3. `addExpense()` → `fetch('/api/expenses', POST)` → HTTP-запрос на Express
4. Express-роутер → `POST /api/expenses` → `ExpenseController.create` (парсинг `req.body`)
5. Контроллер вызывает `ExpenseService.create(amount, description)`
6. Сервис валидирует: `amount != null && description` (IMP:9 — проверка гипотезы валидности)
7. Сервис выполняет `db.prepare(INSERT).run(...)` (IMP:7 — I/O-операция)
8. Сервис читает созданную запись `SELECT * WHERE id = lastInsertRowid` (IMP:7)
9. Контроллер возвращает `res.status(201).json(newExpense)`
10. Хук получает ответ → вызывает `fetchExpenses()` для обновления списка
11. React перерендерит список расходов + тотал

**Сценарий удаления расхода (DeleteExpense):**
1. Пользователь кликает кнопку удаления → `handleDelete(id)`
2. `handleDelete()` → `deleteExpense(id)` из хука
3. `fetch('/api/expenses/:id', DELETE)` → Express
4. Контроллер вызывает `ExpenseService.delete(id)`
5. Сервис: `DELETE FROM expenses WHERE id = ? AND workspace_id = ?` (IMP:7)
6. Возврат `{ success: true }`, обновление списка

**Сценарий просмотра (ViewExpenses):**
1. `useEffect` при монтировании → `fetchExpenses()`
2. `fetch('/api/expenses', GET)` → Express
3. Контроллер → `ExpenseService.getAll()`
4. Сервис: `SELECT * FROM expenses WHERE workspace_id = ? ORDER BY id DESC LIMIT 50` (IMP:7)
5. Ответ → React-стейт → рендер списка
6. Тотал: `expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)` — чистый UI-расчёт

$END_DATA_FLOW

$END_ARCHITECTURE_OVERVIEW

$START_ACCEPTANCE_CRITERIA
### 3. Acceptance Criteria

- [ ] **C1: Layer Isolation** — SQL-запросы только в `expense_service.ts`. Express-роуты только в `expense_controller.ts`. React-компонент не содержит `fetch()` напрямую.
- [ ] **C2: Test Coverage 100% PASS** — `npx vitest run` выдаёт все тесты зелёными. В консоли виден LDD-трейс `[IMP:7-10]` из сервисного слоя.
- [ ] **C3: GREP Navigation** — `grep GREP_SUMMARY src/backend/*.ts src/frontend/**/*.tsx` возвращает по 1 строке на каждый файл с ключевыми словами.
- [ ] **C4: Semantic Markup** — Каждый файл содержит: `# region MODULE_CONTRACT`, `## @purpose`, `## @io`, `## @invariants`, `# GREP_SUMMARY:`, `# STRUCTURE:`, `# endregion MODULE_CONTRACT`.
- [ ] **C5: Backward Compatibility** — API-эндпоинты сохраняют сигнатуры (`GET/POST/DELETE /api/expenses`). UI-интерфейс идентичен текущему.
- [ ] **C6: Doxygen Generation** — `doxygen Doxyfile` выполняется без ошибок, генерируются XML-файлы в `doxygen_output/xml/`.
- [ ] **C7: Anti-Loop Protocol** — `tests/conftest.ts` содержит механизм счётчика попыток (`.test_counter.json`), вывод чеклиста при повторах.
- [ ] **C8: Test Guide** — `tests/test_guide.md` создан и содержит инструкции для QA-агента.

$END_ACCEPTANCE_CRITERIA

$START_IMPLEMENTATION_PLAN
### 4. Implementation Plan (Sequence)

| # | Шаг | Файлы | Тип |
|---|-----|-------|-----|
| 1 | **Создать `src/backend/db.ts`** — модуль БД с `createDb()` и схемой | `src/backend/db.ts` | CREATE |
| 2 | **Создать `src/backend/expense_service.ts`** — бизнес-логика CRUD + валидация | `src/backend/expense_service.ts` | CREATE |
| 3 | **Создать `src/backend/expense_controller.ts`** — Express-роутер | `src/backend/expense_controller.ts` | CREATE |
| 4 | **Рефакторинг `server.ts`** — только инициализация Express + Vite | `server.ts` | MODIFY |
| 5 | **Создать `src/frontend/hooks/useExpenses.ts`** — хук с fetch-логикой | `src/frontend/hooks/useExpenses.ts` | CREATE |
| 6 | **Рефакторинг `src/App.tsx`** — чистый UI + семантическая разметка | `src/App.tsx` | MODIFY |
| 7 | **Семантическая разметка `main.tsx`, `index.css`** | `src/main.tsx`, `src/index.css` | MODIFY |
| 8 | **Создать `tests/conftest.ts`** — Anti-Loop Protocol + test fixtures | `tests/conftest.ts` | CREATE |
| 9 | **Создать `tests/test_expense_service.ts`** — Unit-тесты с LDD-телеметрией | `tests/test_expense_service.ts` | CREATE |
| 10 | **Создать `tests/test_expense_controller.ts`** — Headless API-тесты | `tests/test_expense_controller.ts` | CREATE |
| 11 | **Создать `tests/test_guide.md`** — инструкция для QA | `tests/test_guide.md` | CREATE |
| 12 | **Создать `Doxyfile`** — конфигурация Doxygen для TypeScript | `Doxyfile` | CREATE |
| 13 | **Запуск тестов + Doxygen** — финальная верификация | Все | VERIFY |

$END_IMPLEMENTATION_PLAN

$START_TECH_DECISIONS
### 5. Технические решения

$START_DECISION_LOGGER
#### Решение: Кастомный логгер LDD 2.0 для Node.js

**TYPE:** DECISION
**KEYWORDS:** LDD, logging, IMP, Node.js

$START_CONTRACT
**PURPOSE:** Адаптировать методологию LDD 2.0 (Python `logging` с `[IMP:1-10]`) под TypeScript/Node.js для сохранения совместимости с агентской отладкой.
**DESCRIPTION:** Создать тонкую обёртку над `console` с методами `.trace()`, `.flow()`, `.io()`, `.business()`, `.critical()`, которая форматирует сообщения как `[IMP:1-10][MODULE_NAME][BLOCK_NAME] message`. В тестах перехватывать вывод через `vi.spyOn(console, 'log')`.
**RATIONALE:** TypeScript-экосистема (vitest) не имеет прямого аналога `caplog`. Spy-перехват `console.log` — минимальный и надёжный способ захвата LDD-телеметрии без внешних зависимостей.
**ACCEPTANCE_CRITERIA:** Логгер выводит строки формата `[IMP:7][ExpenseService][CREATE] amount=500.00, description='Продукты'`. В тестах логгер-сообщения фильтруются по `IMP:7-10` и печатаются в консоль.
$END_CONTRACT

$END_DECISION_LOGGER

$START_DECISION_TESTING
#### Решение: Тестовый фреймворк — vitest + supertest

**TYPE:** DECISION
**KEYWORDS:** vitest, supertest, testing, API

$START_CONTRACT
**PURPOSE:** Обеспечить изолированное тестирование бэкенда без поднятия реального сервера.
**DESCRIPTION:**
- **vitest** — нативный для Vite, поддержка ESM/TypeScript, быстрый запуск
- **SQLite `:memory:`** — изолированная БД в каждом тесте через `createDb(':memory:')`
- **Контроллеры тестируются напрямую** — `supertest(app)` для проверки HTTP-статусов и тел ответов
- **Сервисы тестируются через прямой вызов** — `service.create(amount, desc)` → проверка БД
**RATIONALE:** vitest не требует отдельного конфига (читает `vite.config.ts`), работает быстрее Jest, не конфликтует с ESM-импортами.
**ACCEPTANCE_CRITERIA:** `npx vitest run` выполняется за <5 секунд, все тесты зелёные, в консоли виден LDD-трейс.
$END_CONTRACT

$END_DECISION_TESTING

$END_TECH_DECISIONS

$END_DOC_NAME
