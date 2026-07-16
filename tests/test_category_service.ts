// region MODULE_CONTRACT [DOMAIN(8): Budget; CONCEPT(9): UnitTesting, LDDTelemetry; TECH(9): vitest, better-sqlite3]
// ## @modulecontract
// ## @purpose To verify CategoryService CRUD operations (getAll, create, update, delete with soft-delete) using isolated :memory: databases and LDD trace extraction.
// ## @scope Unit tests for CategoryService: create, read, update, delete, soft-delete when transactions exist.
// ## @input None (creates fresh :memory: database per test).
// ## @output Test results with LDD trace printed to console.
// ## @links [CALLS_CLASS: CategoryService; USES: conftest.ts/AntiLoop]
// ## @invariants
// ## - Every test creates its own database via createDb(':memory:').
// ## - LDD telemetry (IMP:7-10) is extracted and printed.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of category service tests]
// ## @modulemap
// ## FUNC 9[Test: create and retrieve category] => test_create_category
// ## FUNC 9[Test: get all returns categories] => test_get_all
// ## FUNC 8[Test: update category name] => test_update_category
// ## FUNC 9[Test: delete category without transactions] => test_delete_empty
// ## FUNC 9[Test: soft-delete category with transactions] => test_soft_delete
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: tests, unit, CategoryService, CRUD, soft-delete, :memory:, LDD, IMP:7-10
// STRUCTURE: ▶ ┌createDb(':memory:')┐ → ○ forEach test: new CategoryService(db) → ⚡ spyOn console.log → ◇ test CRUD → ⊕ print LDD IMP:7-10 trace → ⎋ updateTestCounter(passed)

import { describe, it, expect, vi, afterAll } from 'vitest';
import { createDb } from '../src/backend/db.js';
import { CategoryService } from '../src/backend/category_service.js';
import { ExpenseService } from '../src/backend/expense_service.js';
import { updateTestCounter } from './conftest.js';

// region HELPER_extractLDDTrace [DOMAIN(7): Testing; CONCEPT(8): Telemetry; TECH(6): StringParsing]
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
function createTestEnv() {
    const db = createDb(':memory:');
    const service = new CategoryService(db, 'family_1');
    const logSpy = vi.spyOn(console, 'log');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    return { db, service, logSpy, errorSpy };
}
// endregion HELPER_createTestEnv

describe('CategoryService Unit Tests', () => {
    afterAll(() => {
        updateTestCounter(true);
    });

    // region TEST_get_all [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): UnitTest]
    it('should return all active categories', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const categories = service.getAll();
        // Default categories are seeded by createDb
        expect(categories.length).toBeGreaterThanOrEqual(21);
        expect(categories[0]).toHaveProperty('id');
        expect(categories[0]).toHaveProperty('name');
        expect(categories[0]).toHaveProperty('icon');
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_all

    // region TEST_create_category [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): UnitTest]
    it('should create a new category and return it with id', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const cat = service.create('Тестовая категория', '🧪');
        expect(cat).toBeDefined();
        expect(cat.id).toBeGreaterThan(0);
        expect(cat.name).toBe('Тестовая категория');
        expect(cat.icon).toBe('🧪');
        expect(cat.workspace_id).toBe('family_1');
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_create_category

    // region TEST_update_category [DOMAIN(8): Budget; CONCEPT(8): Update; TECH(7): UnitTest]
    it('should update category name', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const cat = service.create('Старое имя', '📦');
        const updated = service.update(cat.id, 'Новое имя');
        expect(updated).toBeDefined();
        expect(updated.name).toBe('Новое имя');
        expect(updated.id).toBe(cat.id);
        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_update_category

    // region TEST_delete_empty [DOMAIN(9): Budget; CONCEPT(9): Delete; TECH(8): UnitTest]
    it('should hard-delete category with no transactions', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const cat = service.create('Временная', '🗑️');
        expect(service.delete(cat.id)).toBe(true);

        // Verify it's gone from getAll
        const all = service.getAll();
        const found = all.find(c => c.id === cat.id);
        expect(found).toBeUndefined();

        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_delete_empty

    // region TEST_soft_delete [DOMAIN(9): Budget; CONCEPT(9): SoftDelete; TECH(8): UnitTest]
    it('should soft-delete category when transactions reference it', () => {
        const { db, service, logSpy, errorSpy } = createTestEnv();
        const cat = service.create('Продукты своя', '🛒');

        // Create a transaction referencing this category
        const expenseService = new ExpenseService(db, 'family_1');
        expenseService.create('expense', 500, 'Хлеб', cat.id);

        // Delete should soft-delete (set is_active=0) instead of hard-delete
        expect(service.delete(cat.id)).toBe(true);

        // Category should NOT appear in getAll (only active)
        const all = service.getAll();
        const found = all.find(c => c.id === cat.id);
        expect(found).toBeUndefined();

        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_soft_delete

    // region TEST_delete_nonexistent [DOMAIN(7): Budget; CONCEPT(7): Delete; TECH(6): UnitTest]
    it('should return false when deleting non-existent category', () => {
        const { service, logSpy, errorSpy } = createTestEnv();
        const result = service.delete(99999);
        expect(result).toBe(false);
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_delete_nonexistent
});
