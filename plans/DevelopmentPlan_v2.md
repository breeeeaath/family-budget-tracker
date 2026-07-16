$START_DOC_NAME

**PURPOSE:** Комплексная доработка приложения «Трекер Трат»: локализация UTF-8, баланс с доходами/расходами, статистика по периодам, переходящий остаток, система категорий.
**SCOPE:** Бэкенд (новые таблицы + сервисы: CategoryService, расширенный ExpenseService), фронтенд (обновлённый UI), тесты (vitest + supertest).
**KEYWORDS:** DOMAIN(Budget): ExpenseTracking, Categories, Balance, Statistics, MonthlyRollover; CONCEPT(Architecture): LayerIsolation, DI, SingleResponsibility; TECH(Backend): Express, better-sqlite3, TypeScript; TECH(Frontend): React19, Tailwind4; TECH(Testing): vitest, supertest, LDD.

$START_DOCUMENT_PLAN

**SECTION_GOALS:**
- GOAL [UTF-8 локализация: все тексты на русском без артефактов] => G_UTF8
- GOAL [Общий баланс: доходы + расходы, пересчёт после каждой операции] => G_BALANCE
- GOAL [Статистика: расходы за сегодня/вчера/неделю/месяц] => G_STATS
- GOAL [Переходящий остаток: авто-перенос баланса между месяцами] => G_ROLLOVER
- GOAL [Категории: CRUD категорий, привязка к операциям] => G_CATEGORIES
- GOAL [Сохранение архитектуры: DI, LayerIsolation, LDD, семантическая разметка] => G_ARCH
- GOAL [100% тестов на все новые модули] => G_TESTS

**SECTION_USE_CASES:**
- USE_CASE [User adds income/expense with category selection] => UC_ADD_TX
- USE_CASE [User views current balance updated in real-time] => UC_VIEW_BALANCE
- USE_CASE [User reviews statistics per period (today/yesterday/week/month)] => UC_VIEW_STATS
- USE_CASE [System auto-rolls over balance at month change] => UC_ROLLOVER
- USE_CASE [User manages categories (create/rename/delete)] => UC_MANAGE_CATS

$END_DOCUMENT_PLAN

$START_ARCHITECTURE_OVERVIEW

$START_DRAFT_CODE_GRAPH

```xml
<KnowledgeGraph>
  <FamilyBudget_2_0_0_Info TYPE="PROJECT_INFO">
    <keywords>Budget, ExpenseTracking, Categories, Balance, Income, Expense, Rollover, React, Express, SQLite, LDD</keywords>
    <annotation>Семейный трекер трат v2.0: баланс доходов/расходов, категории, статистика по периодам, переходящий остаток.</annotation>
    <BusinessScenarios>
      <Scenario NAME="AddTransaction">User -> Select Type (income/expense) + Category + Amount + Description -> POST /api/transactions -> Insert DB -> Recalculate Balance -> Refresh UI</Scenario>
      <Scenario NAME="ViewBalance">User -> Open App -> GET /api/balance -> Display Balance + Stats -> Auto-update on operations</Scenario>
      <Scenario NAME="ViewStats">User -> Open App -> GET /api/stats?periods=day,week,month -> Display stats cards</Scenario>
      <Scenario NAME="MonthRollover">System -> Check current month vs last record -> Auto-create rollover entry -> Archive old month data</Scenario>
      <Scenario NAME="ManageCategories">User -> Add/Rename/Delete category -> POST|PUT|DELETE /api/categories -> Update UI dropdown</Scenario>
    </BusinessScenarios>
  </FamilyBudget_2_0_0_Info>

  <server_ts FILE="server.ts" TYPE="ENTRY_POINT_MODULE">
    <annotation>Точка входа. Создаёт db, CategoryService, ExpenseService (расширенный), StatsService, контроллеры.</annotation>
  </server_ts>

  <db_ts FILE="src/backend/db.ts" TYPE="DATABASE_MODULE">
    <annotation>Создаёт и возвращает SQLite-соединение. Расширен схемой: categories, transactions (вместо expenses), monthly_balance.</annotation>
    <createDb_FUNC NAME="createDb" TYPE="IS_FUNCTION_OF_MODULE">
      <annotation>Создаёт таблицы: categories, transactions (с category_id и type), monthly_balance. Выполняет миграцию старых данных.</annotation>
    </createDb_FUNC>
  </db_ts>

  <category_service_ts FILE="src/backend/category_service.ts" TYPE="BUSINESS_LOGIC_MODULE">
    <annotation>CRUD категорий. DI через конструктор (db, workspaceId).</annotation>
    <CategoryService_CLASS NAME="CategoryService" TYPE="IS_CLASS_OF_MODULE">
      <annotation>Управление категориями расходов/доходов.</annotation>
      <getAll_METHOD NAME="getAll" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Возвращает все категории для workspace.</annotation>
        <CrossLinks><Link TARGET="db_ts" TYPE="READS_DATA_FROM" /></CrossLinks>
      </getAll_METHOD>
      <create_METHOD NAME="create" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Создаёт новую категорию с дефолтными значениями.</annotation>
      </create_METHOD>
      <update_METHOD NAME="update" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Переименовывает категорию.</annotation>
      </update_METHOD>
      <delete_METHOD NAME="delete" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Удаляет категорию (если нет связанных транзакций) или помечает как неактивную.</annotation>
      </delete_METHOD>
    </CategoryService_CLASS>
  </category_service_ts>

  <expense_service_ts FILE="src/backend/expense_service.ts" TYPE="BUSINESS_LOGIC_MODULE">
    <annotation>Расширенный сервис транзакций: income + expense, category_id, баланс, статистика.</annotation>
    <ExpenseService_CLASS NAME="ExpenseService" TYPE="IS_CLASS_OF_MODULE">
      <getAll_METHOD NAME="getAll" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Возвращает последние 50 транзакций с JOIN по категориям.</annotation>
      </getAll_METHOD>
      <create_METHOD NAME="create" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Создаёт транзакцию с type (income/expense), category_id.</annotation>
      </create_METHOD>
      <delete_METHOD NAME="delete" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Удаляет транзакцию.</annotation>
      </delete_METHOD>
      <getBalance_METHOD NAME="getBalance" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Вычисляет баланс: SUM(incomes) - SUM(expenses) + monthly_balance.opening_balance.</annotation>
      </getBalance_METHOD>
      <getStats_METHOD NAME="getStats" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Расходы за сегодня/вчера/неделю/месяц.</annotation>
      </getStats_METHOD>
    </ExpenseService_CLASS>
  </expense_service_ts>

  <stats_service_ts FILE="src/backend/stats_service.ts" TYPE="BUSINESS_LOGIC_MODULE">
    <annotation>Аналитика и переходящий остаток. DI через конструктор (db, workspaceId).</annotation>
    <StatsService_CLASS NAME="StatsService" TYPE="IS_CLASS_OF_MODULE">
      <getStats_METHOD NAME="getStats" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Вычисляет расходы за периоды: today, yesterday, this_week, this_month.</annotation>
      </getStats_METHOD>
      <getOpeningBalance_METHOD NAME="getOpeningBalance" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Возвращает начальный баланс текущего месяца.</annotation>
      </getOpeningBalance_METHOD>
      <rolloverMonth_METHOD NAME="rolloverMonth" TYPE="IS_METHOD_OF_CLASS">
        <annotation>Авто-перенос: закрывает прошлый месяц, создаёт запись в monthly_balance.</annotation>
      </getOpeningBalance_METHOD>
    </StatsService_CLASS>
  </stats_service_ts>

  <category_controller_ts FILE="src/backend/category_controller.ts" TYPE="API_ROUTER_MODULE">
    <annotation>Express Router для /api/categories: GET, POST, PUT/:id, DELETE/:id.</annotation>
  </category_controller_ts>

  <expense_controller_ts FILE="src/backend/expense_controller.ts" TYPE="API_ROUTER_MODULE">
    <annotation>Расширенные endpoints: /api/transactions (GET/POST/DELETE), /api/balance (GET), /api/stats (GET).</annotation>
  </expense_controller_ts>

  <useExpenses_ts FILE="src/frontend/hooks/useExpenses.ts" TYPE="REACT_HOOK_MODULE">
    <annotation>Расширенный хук: transactions, balance, stats, isLoading.</annotation>
  </useExpenses_ts>

  <useCategories_ts FILE="src/frontend/hooks/useCategories.ts" TYPE="REACT_HOOK_MODULE">
    <annotation>Хук для CRUD категорий.</annotation>
  </useCategories_ts>

  <App_tsx FILE="src/App.tsx" TYPE="UI_COMPONENT_MODULE">
    <annotation>Главный UI: форма с выбором типа/категории, баланс, статистика, список транзакций.</annotation>
  </App_tsx>

  <ProjectCrossLinks TYPE="MODULE_INTERACTIONS_OVERVIEW">
    <Link TARGET="server_ts" TYPE="ORCHESTRATES_FLOW" />
    <Link TARGET="db_ts" TYPE="PROVIDES_PERSISTENCE" />
    <Link TARGET="category_service_ts" TYPE="BUSINESS_LOGIC" />
    <Link TARGET="expense_service_ts" TYPE="BUSINESS_LOGIC" />
    <Link TARGET="stats_service_ts" TYPE="ANALYTICS_LOGIC" />
  </ProjectCrossLinks>
</KnowledgeGraph>
```

$END_DRAFT_CODE_GRAPH

$START_DATA_FLOW

### 2. Step-by-step Data Flow

**Сценарий: Добавление транзакции**
1. User заполняет форму: тип (доход/расход), категория (dropdown), сумма, описание
2. `handleSubmit` -> `addTransaction(type, category_id, amount, description)`
3. `useExpenses` -> `POST /api/transactions` с телом `{type, category_id, amount, description}`
4. `expense_controller` -> валидация -> `ExpenseService.create(type, category_id, amount, description)`
5. `ExpenseService`: INSERT INTO transactions + LDD-лог IMP:9
6. Ответ 201 -> хук перезапрашивает `transactions`, `balance`, `stats`
7. UI перерисовывается: обновлённый баланс, новая транзакция в списке, актуальная статистика

**Сценарий: Расчёт баланса**
1. `ExpenseService.getBalance(workspaceId)`
2. SQL: `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) FROM transactions WHERE workspace_id = ?`
3. + `StatsService.getOpeningBalance(workspaceId)` из `monthly_balance`
4. Итог: opening_balance + net_balance
5. LDD-лог IMP:9 с вычисленным балансом
6. Возврат клиенту -> отображение

**Сценарий: Переходящий остаток**
1. При каждом запросе баланса `StatsService.getBalance()` вызывает `rolloverMonth()` внутри
2. `rolloverMonth()`: SELECT last_rollover FROM monthly_balance ORDER BY id DESC LIMIT 1
3. Если месяц last_rollover != текущий месяц:
   a. Вычислить итоговый баланс прошлого месяца
   b. INSERT в monthly_balance (month, opening_balance, closing_balance)
   c. LDD-лог IMP:9 с суммой переноса
4. Возврат актуального opening_balance

$END_DATA_FLOW

$END_ARCHITECTURE_OVERVIEW

$START_IMPLEMENTATION_PLAN

### 3. Implementation Plan

| Step | Action | Target | Description |
|------|--------|--------|-------------|
| 1 | MODIFY | `src/backend/db.ts` | Расширить схему: таблицы `categories`, переименовать `expenses` -> `transactions` (с type, category_id), `monthly_balance`. Миграция старых данных. |
| 2 | CREATE | `src/backend/category_service.ts` | CategoryService: CRUD категорий с DI и LDD-логами. Семантическая разметка. |
| 3 | MODIFY | `src/backend/expense_service.ts` | Расширить: type (income/expense), category_id, JOIN с categories. Добавить getBalance(). |
| 4 | CREATE | `src/backend/stats_service.ts` | StatsService: getStats(periods), getOpeningBalance(), rolloverMonth(). |
| 5 | CREATE | `src/backend/category_controller.ts` | Express Router: GET/POST/PUT/DELETE /api/categories. |
| 6 | MODIFY | `src/backend/expense_controller.ts` | Расширить endpoints: /api/transactions, /api/balance, /api/stats. |
| 7 | MODIFY | `server.ts` | Инициализация новых сервисов и роутеров. |
| 8 | CREATE | `src/frontend/hooks/useCategories.ts` | React хук для CRUD категорий. |
| 9 | MODIFY | `src/frontend/hooks/useExpenses.ts` | Расширить: type, category_id в fetch. Добавить balance, stats. |
| 10 | MODIFY | `src/App.tsx` | Новый UI: выбор типа/категории, карточка баланса, блок статистики, обновлённый список. UTF-8 локализация. |
| 11 | MODIFY | `tests/test_expense_service.ts` | Расширить тесты: type, category_id, getBalance. |
| 12 | CREATE | `tests/test_category_service.ts` | Тесты CategoryService (CRUD + edge cases). |
| 13 | CREATE | `tests/test_stats_service.ts` | Тесты StatsService (статистика, rollover). |
| 14 | MODIFY | `tests/test_expense_controller.ts` | Расширить: новые endpoints. |
| 15 | CREATE | `tests/test_category_controller.ts` | Тесты контроллера категорий. |
| 16 | MODIFY | `tests/test_guide.md` | Обновить test guide. |
| 17 | MODIFY | `Doxyfile` | Добавить новые файлы в INPUT. |
| 18 | RUN | `doxygen Doxyfile` | Сгенерировать обновлённую документацию. |

$END_IMPLEMENTATION_PLAN

$START_ACCEPTANCE_CRITERIA

### 4. Acceptance Criteria

- [ ] **C1 (UTF-8):** Все элементы UI отображаются на русском языке без символов вроде «�», «вЂ» и прочих артефактов кодировки.
- [ ] **C2 (Баланс):** Баланс отображается на главном экране, пересчитывается после каждой операции, учитывает доходы и расходы.
- [ ] **C3 (Статистика):** Карточки статистики показывают расходы за сегодня / вчера / неделю / месяц, обновляются автоматически.
- [ ] **C4 (Переходящий остаток):** При смене месяца баланс переносится автоматически, архив доступен.
- [ ] **C5 (Категории):** CRUD категорий работает через API и UI. Дефолтные категории создаются при инициализации БД.
- [ ] **C6 (Архитектура):** Сохранена Layer Isolation, DI, GREP_SUMMARY/STRUCTURE на всех новых файлах, LDD-логи IMP:7-10.
- [ ] **C7 (Тесты):** `npx vitest run` — 100% PASS на всех тестовых файлах (включая новые).
- [ ] **C8 (Doxygen):** `doxygen Doxyfile` выполняется без ошибок, XML сгенерированы для всех новых файлов.
- [ ] **C9 (Vercel):** `npm run build` завершается успешно, деплой на Vercel без ошибок.
- [ ] **C10 (Backward Compat):** Существующее API не ломается (при необходимости — обратная совместимость через миграцию).

$END_ACCEPTANCE_CRITERIA

$END_DOC_NAME
