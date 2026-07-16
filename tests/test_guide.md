# Test Guide for QA Agent

## Project: Family Budget Tracker (Refactored)

### Overview
This test suite verifies the backend layer isolation (Database → Service → Controller) of the Family Budget Tracker. Tests are written in TypeScript using **vitest** and **supertest**.

### Test Files

| File | Type | What it tests |
|------|------|---------------|
| `tests/conftest.ts` | Infrastructure | Anti-Loop Protocol with `.test_counter.json` attempt tracking |
| `tests/test_expense_service.ts` | Unit | `ExpenseService` CRUD operations, validation, LDD telemetry |
| `tests/test_expense_controller.ts` | API | Express route handlers via supertest (headless) |

### How to Run

```bash
# From project root
npx vitest run

# With verbose output
npx vitest run --reporter=verbose

# Watch mode (for development)
npx vitest
```

### LDD Telemetry Markers

The `ExpenseService` and controller modules use structured logging with `[IMP:N]` importance levels:

| Marker | Meaning | Expected in tests |
|--------|---------|-------------------|
| `[IMP:7]` | I/O operation (DB access, API call) | `service.getAll`, `service.create`, `service.delete`, `service.getTotal` |
| `[IMP:9]` | Business logic decision (validation pass/fail) | `service.create` validation checks |
| `[IMP:10]` | Critical error | Should NOT appear if tests pass |

### Test Expectations

#### Service Tests (`test_expense_service.ts`)
- **7 tests + 1 integration test** = 8 total
- Each test creates its own `:memory:` database
- LDD trace `[IMP:7-10]` is printed to console after each test (both stdout and stderr are captured)
- Validation tests expect `Error` with message starting with `'Validation failed'`

#### Controller Tests (`test_expense_controller.ts`)
- **6 tests** covering GET, POST, DELETE, and validation error paths
- Uses `supertest` — no real server needed
- Routes mounted at `/api` prefix

### Anti-Loop Protocol

The `conftest.ts` implements an attempt counter stored in `.test_counter.json`:

- **0 attempts**: Clean run, no checklist
- **1-2 attempts**: Standard checklist printed
- **3 attempts**: External help suggestion (MCP tavily / Context 7)
- **4 attempts**: Looping risk warning
- **5+ attempts**: CRITICAL — agent looping, operator needed

### Expected `[IMP:9]` Log Lines (Required for Test Validity)

```
[IMP:9][ExpenseService][create] Validation passed for amount=..., description='...'
[IMP:9][ExpenseService][create] Expense created successfully: id=..., amount=...
[IMP:9][ExpenseService][delete] Expense id=... deleted successfully
[IMP:9][createRouter][POST] Created expense id=..., returning 201
```

If these lines are absent in the LDD trace output, the test may be passing without proper business logic verification.

### QA Verification Checklist

- [ ] Все 15 тестов пройдены (9 service + 6 controller)
- [ ] LDD `[IMP:7-10]` trace выводится в консоль для service-тестов (включая stderr для validation-ошибок)
- [ ] Нет `[IMP:10]` critical errors в трейсах
- [ ] `.test_counter.json` обновляется: сбрасывается в 0 при успехе, инкрементируется при падениях
- [ ] `updateTestCounter` вызывается в `afterAll` каждого тестового файла
- [ ] API-ответы соответствуют ожидаемой структуре и статус-кодам
