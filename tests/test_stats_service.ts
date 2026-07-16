// region MODULE_CONTRACT [DOMAIN(8): Budget; CONCEPT(9): UnitTesting, LDDTelemetry; TECH(9): vitest, better-sqlite3]
// ## @modulecontract
// ## @purpose To verify StatsService analytics (getStats, getOpeningBalance, rolloverMonth, getBalance) with isolated :memory: databases.
// ## @scope Unit tests for period statistics calculation, monthly rollover logic, and balance aggregation.
// ## @input None (creates fresh :memory: database per test).
// ## @output Test results with LDD trace printed to console.
// ## @links [CALLS_CLASS: StatsService, ExpenseService; USES: conftest.ts/AntiLoop]
// ## @invariants
// ## - Every test creates its own database via createDb(':memory:').
// ## - LDD telemetry (IMP:7-10) is extracted and printed.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of stats service tests]
// ## @modulemap
// ## FUNC 9[Test: getStats returns period breakdown] => test_get_stats
// ## FUNC 8[Test: getOpeningBalance without rollover returns 0] => test_get_opening_balance_zero
// ## FUNC 9[Test: rolloverMonth creates balance record] => test_rollover_month
// ## FUNC 8[Test: getBalance combines opening + transactions] => test_get_balance
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: tests, unit, StatsService, stats, analytics, rollover, monthly balance, :memory:, LDD, IMP:7-10
// STRUCTURE: ▶ ┌createDb(':memory:')┐ → ○ forEach test: new StatsService(db) + ExpenseService(db) → ⚡ spyOn console.log → ◇ test stats/rollover/balance → ⊕ print LDD IMP:7-10 trace → ⎋ updateTestCounter(passed)

import { describe, it, expect, vi, afterAll } from 'vitest';
import { createDb } from '../src/backend/db.js';
import { StatsService } from '../src/backend/stats_service.js';
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
    const statsService = new StatsService(db, 'family_1');
    const expenseService = new ExpenseService(db, 'family_1');
    const logSpy = vi.spyOn(console, 'log');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    return { db, statsService, expenseService, logSpy, errorSpy };
}
// endregion HELPER_createTestEnv

describe('StatsService Unit Tests', () => {
    afterAll(() => {
        updateTestCounter(true);
    });

    // region TEST_get_stats [DOMAIN(9): Budget; CONCEPT(9): Statistics; TECH(8): UnitTest]
    it('should return stats with correct period breakdown', () => {
        const { statsService, expenseService, logSpy, errorSpy } = createTestEnv();
        // Create expense for today
        expenseService.create('expense', 300, 'Продукты');
        expenseService.create('expense', 200, 'Такси');
        // Create income (should not affect expense stats)
        expenseService.create('income', 1000, 'Зарплата');

        const stats = statsService.getStats();
        expect(stats).toHaveProperty('today');
        expect(stats).toHaveProperty('yesterday');
        expect(stats).toHaveProperty('this_week');
        expect(stats).toHaveProperty('this_month');
        // Today includes the 300+200 expenses
        expect(stats.today).toBe(500);
        // Yesterday should be 0 (no past expenses)
        expect(stats.yesterday).toBe(0);
        // This week and month include today's expenses
        expect(stats.this_week).toBeGreaterThanOrEqual(500);
        expect(stats.this_month).toBeGreaterThanOrEqual(500);

        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_stats

    // region TEST_get_opening_balance_zero [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): UnitTest]
    it('should return 0 opening balance when no rollover exists', () => {
        const { statsService, logSpy, errorSpy } = createTestEnv();
        const balance = statsService.getOpeningBalance();
        expect(balance).toBe(0);

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_opening_balance_zero

    // region TEST_rollover_month [DOMAIN(9): Budget; CONCEPT(9): Rollover; TECH(8): UnitTest]
    it('should create opening balance record via rolloverMonth', () => {
        const { statsService, expenseService, logSpy, errorSpy } = createTestEnv();
        // Start with some balance
        expenseService.create('income', 5000, 'Зарплата');
        expenseService.create('expense', 2000, 'Аренда');

        // Call rollover — should create monthly_balance record for current month
        const openingBalance = statsService.rolloverMonth();
        expect(openingBalance).toBeGreaterThanOrEqual(0);

        // Subsequent calls should return same opening balance (idempotent)
        const openingBalance2 = statsService.rolloverMonth();
        expect(openingBalance2).toBe(openingBalance);

        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_rollover_month

    // region TEST_get_balance [DOMAIN(9): Budget; CONCEPT(9): Aggregation; TECH(7): UnitTest]
    it('should calculate balance combining opening + transactions', () => {
        const { statsService, expenseService, logSpy, errorSpy } = createTestEnv();
        // Income: 5000, Expenses: 300+200=500. Net: 4500
        expenseService.create('income', 5000, 'Зарплата');
        expenseService.create('expense', 300, 'Продукты');
        expenseService.create('expense', 200, 'Транспорт');

        const balance = statsService.getBalance();
        // Without rollover, opening_balance is 0, net from transactions = 5000-300-200 = 4500
        expect(balance).toBe(4500);

        extractLDDTrace(
            logSpy.mock.calls.map(c => String(c[0])),
            errorSpy.mock.calls.map(c => String(c[0]))
        );
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_get_balance

    // region TEST_stats_empty [DOMAIN(7): Budget; CONCEPT(7): EdgeCase; TECH(6): UnitTest]
    it('should return zero stats when no transactions exist', () => {
        const { statsService, logSpy, errorSpy } = createTestEnv();
        const stats = statsService.getStats();
        expect(stats.today).toBe(0);
        expect(stats.yesterday).toBe(0);
        expect(stats.this_week).toBe(0);
        expect(stats.this_month).toBe(0);

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
    // endregion TEST_stats_empty
});
