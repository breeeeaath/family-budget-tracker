# QA Test Guide — Family Budget Tracker v2.0

## Test Files Summary

| Test File | Type | Tests | Description |
|-----------|------|-------|-------------|
| `test_expense_service.ts` | Unit | 9 | ExpenseService CRUD + validation with new `type` parameter |
| `test_expense_controller.ts` | API | 9 | TransactionController: /api/transactions, /api/balance, /api/stats |
| `test_category_service.ts` | Unit | 6 | CategoryService: CRUD + soft-delete when transactions exist |
| `test_stats_service.ts` | Unit | 5 | StatsService: period stats, monthly rollover, balance |

**Total: 29 tests across 4 files.**

## Run Command
```bash
npx vitest run
```

## LDD Telemetry Markers

| IMP Level | Category | Description |
|-----------|----------|-------------|
| IMP:7 | I/O & Boundary | DB access, API calls, file reads |
| IMP:9 | Business Logic | Hypothesis testing, balance calculation, category create/delete |
| IMP:10 | Critical Error | Validation failures, fatal conditions |

## Expected IMP:9 Log Lines (for test validity)

### test_expense_service.ts
- `[IMP:9][ExpenseService][create] Created transaction id=X: type=expense, amount=..., description='...'`
- `[IMP:9][ExpenseService][delete] Deleted transaction id=X`
- `[IMP:9][ExpenseService][getBalance] Balance for workspace 'family_1': ...`

### test_category_service.ts
- `[IMP:9][CategoryService][create] Created category id=X: name='...'`
- `[IMP:9][CategoryService][delete] Deleting category id=X, name='...'`

### test_stats_service.ts
- `[IMP:9][StatsService][getStats] Stats for workspace 'family_1': today=..., yesterday=...`
- `[IMP:9][StatsService][rolloverMonth] Rollover for YYYY-MM: opening_balance=...`

## Anti-Loop Protocol
- 0 attempts = Clean (reset)
- 1-2 = Standard checklist
- 3 = External help suggested
- 4 = Looping risk warning
- 5+ = CRITICAL — operator intervention needed

## QA Verification Checklist
- [ ] All 29 tests pass (100% PASS)
- [ ] LDD IMP:9 markers present in test output
- [ ] No unexpected console.error calls (except deliberate validation error tests)
- [ ] Test counter resets to 0 after green run
- [ ] All test files have GREP_SUMMARY and STRUCTURE lines
- [ ] New services (CategoryService, StatsService) covered by dedicated test files
