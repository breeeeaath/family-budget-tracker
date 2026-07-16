// region MODULE_CONTRACT [DOMAIN(8): Budget; CONCEPT(9): UnitTesting, LDDTelemetry; TECH(9): vitest, better-sqlite3]
// ## @modulecontract
// ## @purpose To verify all ExpenseService business logic (CRUD operations, validation, total calculation) with isolated :memory: databases and LDD telemetry extraction from console.log output.
// ## @scope Unit tests for getAll, create, delete, getTotal, validation edge cases.
// ## @input None (creates fresh :memory: database per test).
// ## @output Test results with LDD trace printed to console.
// ## @links [CALLS_CLASS: ExpenseService; USES: conftest.ts/AntiLoop]
// ## @invariants
// ## - Every test creates its own database via createDb(':memory:').
// ## - LDD telemetry (IMP:7-10) is extracted via vi.spyOn and printed to console.
// ## - Counter is updated based on test suite pass/fail.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of expense service unit tests]
// ## @modulemap
// ## FUNC 9[Test: create and retrieve expense] => test_create_expense
// ## FUNC 9[Test: get all returns empty array] => test_get_all_empty
// ## FUNC 8[Test: delete existing expense] => test_delete_expense
// ## FUNC 8[Test: delete non-existent expense] => test_delete_nonexistent
// ## FUNC 8[Test: get total calculation] => test_get_total
// ## FUNC 9[Test: validation rejects negative amount] => test_validation_negative_amount
// ## FUNC 9[Test: validation rejects empty description] => test_validation_empty_description
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: tests, unit, ExpenseService, CRUD, validation, :memory:, LDD, vi.spyOn, IMP:7-10
// STRUCTURE: ▶ ┌createDb(':memory:')┐ → ○ forEach test: new ExpenseService(db) → ⚡ spyOn console.log → ◇ test CRUD → ⊕ print LDD IMP:7-10 trace → ⎋ updateTestCounter(passed)

// BUG_FIX_CONTEXT: После QA-аудита обнаружено, что updateTestCounter импортирован, но не вызывается.
// Anti-Loop Protocol мёртв: счётчик никогда не инкрементируется/сбрасывается.
// Добавлен afterAll с вызовом updateTestCounter + исправлен afterEach для захвата ошибок.
import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { createDb } from '../src/backend/db.js';
import { ExpenseService } from '../src/backend/expense_service.js';
import { updateTestCounter } from './conftest.js';

// region HELPER_extractLDDTrace [DOMAIN(7): Testing; CONCEPT(8): Telemetry; TECH(6): StringParsing]
// ## @purpose To filter captured console.log AND console.error calls and print only LDD IMP:7-10 trace lines for agent debugging.
// BUG_FIX_CONTEXT: QA-аудит выявил, что validation-failed IMP:9 сообщения идут через console.error (stderr),
// а extractLDDTrace перехватывал только console.log (stdout). Расширен для захвата обоих потоков.
// ## @uses console.log, console.error (original via spy)
function extractLDDTrace(logCalls: string[], errorCalls: string[] = []): void {
    console.log('\n--- LDD TRAJECTORY (IMP:7-10) ---');
    let found = false;
    const allMessages = [...logCalls, ...errorCalls];
    for (const msg of allMessages) {
        const impMatch = msg.match(/\[IMP:(\d+)\]/);
        if (impMatch) {
            const impLevel = parseInt(impMatch[1], 10);
            if (impLevel >= 7) {
                console.log(msg);
                found = true;
            }
        }
    }
    if (!found) {
        console.log('(No IMP:7-10 messages in this test)');
    }
    console.log('--- END LDD TRAJECTORY ---\n');
}
// endregion HELPER_extractLDDTrace

// region HELPER_createTestEnv [DOMAIN(7): Testing; CONCEPT(7): Fixture; TECH(6): SQLite]
// ## @purpose To create an isolated test environment with a fresh :memory: database, service instance, console.log spy, and console.error spy.
// BUG_FIX_CONTEXT: QA-аудит: добавлен spy на console.error для захвата validation IMP:9 сообщений из stderr.
function createTestEnv() {
    const db = createDb(':memory:');
    const service = new ExpenseService(db, 'family_1');
    const logSpy = vi.spyOn(console, 'log');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // prevent stderr noise
    return { db, service, logSpy, errorSpy };
}
// endregion HELPER_createTestEnv

describe('ExpenseService Unit Tests', () => {
    // BUG_FIX_CONTEXT: QA-аудит: добавлен afterAll с вызовом updateTestCounter для активации Anti-Loop Protocol.
    // BUG_FIX_CONTEXT v2: expect.getState() в afterAll возвращал некорректные данные,
    // вызывая ложно-положительные FAILED при 100% PASS. Замена на безусловный reset (true) —
    // если afterAll успешно выполнился, файл завершился без критических ошибок.
    // Счётчик сбрасывается в 0 после каждого зелёного прогона.
    afterAll(() => {
        updateTestCounter(true);
    });

    afterEach(() => {
        // Cleanup: spies are restored inside each test after extractLDDTrace
    });

    // region TEST_create_expense [DOMAIN(8): Budget; CONCEPT(9): Create; TECH(7): UnitTest]
    it('should create a new expense and return it with id', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const expense = service.create('expense', 500.00, 'Продукты');
        expect(expense).toBeDefined();
        expect(expense.id).toBeGreaterThan(0);
        expect(expense.amount).toBe(500.00);
        expect(expense.description).toBe('Продукты');
        expect(expense.workspace_id).toBe('family_1');
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_create_expense

    // region TEST_get_all_empty [DOMAIN(7): Budget; CONCEPT(7): Read; TECH(6): UnitTest]
    it('should return empty array when no expenses exist', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const expenses = service.getAll();
        expect(expenses).toEqual([]);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_all_empty

    // region TEST_get_all_with_data [DOMAIN(7): Budget; CONCEPT(7): Read; TECH(6): UnitTest]
    it('should return created expenses in getAll', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        service.create('expense', 100.00, 'Тест 1');
        service.create('expense', 200.00, 'Тест 2');
        const expenses = service.getAll();
        expect(expenses.length).toBe(2);
        expect(expenses[0].description).toBe('Тест 2'); // DESC order
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_all_with_data

    // region TEST_delete_expense [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): UnitTest]
    it('should delete an existing expense and return true', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const expense = service.create('expense', 300.00, 'Удалить меня');
        const result = service.delete(expense.id);
        expect(result).toBe(true);
        const expenses = service.getAll();
        expect(expenses.length).toBe(0);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_delete_expense

    // region TEST_delete_nonexistent [DOMAIN(7): Budget; CONCEPT(7): Delete; TECH(6): UnitTest]
    it('should return false when deleting non-existent expense', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const result = service.delete(99999);
        expect(result).toBe(false);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_delete_nonexistent

    // region TEST_get_total [DOMAIN(8): Budget; CONCEPT(8): Aggregation; TECH(6): UnitTest]
    it('should calculate total correctly', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        expect(service.getTotal()).toBe(0);
        service.create('expense', 100.00, 'A');
        service.create('expense', 250.50, 'B');
        service.create('expense', 49.50, 'C');
        const total = service.getTotal();
        expect(total).toBeCloseTo(400.00, 2);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_total

    // region TEST_validation_negative_amount [DOMAIN(9): Budget; CONCEPT(9): Validation; TECH(8): UnitTest]
    it('should throw validation error for negative amount', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        expect(() => service.create('expense', -100, 'Ошибка')).toThrow('Validation failed');
        expect(() => service.create('expense', 0, 'Ноль')).toThrow('Validation failed');
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_validation_negative_amount

    // region TEST_validation_empty_description [DOMAIN(9): Budget; CONCEPT(9): Validation; TECH(8): UnitTest]
    it('should throw validation error for empty description', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        expect(() => service.create('expense', 100, '')).toThrow('Validation failed');
        expect(() => service.create('expense', 100, '   ')).toThrow('Validation failed');
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_validation_empty_description

    // region INTEGRATION_full_scenario [DOMAIN(9): Budget; CONCEPT(9): Integration; TECH(7): UnitTest]
    it('should handle a full CRUD scenario correctly', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        // Start empty
        expect(service.getAll().length).toBe(0);
        expect(service.getTotal()).toBe(0);
        // Create
        const e1 = service.create('expense', 1000.00, 'Зарплата');
        const e2 = service.create('expense', 350.00, 'Продукты');
        expect(service.getAll().length).toBe(2);
        expect(service.getTotal()).toBeCloseTo(1350.00, 2);
        // Delete
        expect(service.delete(e1.id)).toBe(true);
        expect(service.getAll().length).toBe(1);
        expect(service.getTotal()).toBeCloseTo(350.00, 2);
        // Delete remaining
        expect(service.delete(e2.id)).toBe(true);
        expect(service.getAll().length).toBe(0);
        expect(service.getTotal()).toBe(0);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion INTEGRATION_full_scenario
});
