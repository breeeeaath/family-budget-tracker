// region MODULE_CONTRACT [DOMAIN(8): Budget; CONCEPT(9): APITesting, Headless; TECH(9): vitest, supertest, Express]
// ## @modulecontract
// ## @purpose To verify Express route handlers for transaction/balance/stats API using supertest without starting a real HTTP server.
// ## @scope Headless tests for GET/POST/DELETE /api/transactions, GET /api/balance, GET /api/stats with valid and invalid inputs.
// ## @input None (creates fresh :memory: database and Express app per test).
// ## @output Test results with HTTP status and body assertions.
// ## @links [USES_API(9): supertest; CALLS_CLASS: ExpenseService, StatsService; USES: conftest.ts/AntiLoop]
// ## @invariants
// ## - Every test creates its own Express app with fresh DB.
// ## - Tests verify both success (200/201) and error (400/500) paths.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Updated for /api/transactions, GET /balance, GET /stats. New createRouter(service, statsService) signature.]
// ## @modulemap
// ## FUNC 9[Test: GET /transactions returns 200] => test_get_transactions
// ## FUNC 9[Test: POST /transactions returns 201] => test_create_transaction
// ## FUNC 8[Test: POST /transactions invalid returns 400] => test_create_invalid
// ## FUNC 8[Test: DELETE /transactions returns 200] => test_delete_transaction
// ## FUNC 8[Test: GET /balance returns 200] => test_get_balance
// ## FUNC 8[Test: GET /stats returns 200] => test_get_stats
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: tests, API, supertest, controller, transactions, balance, stats, GET, POST, DELETE, HTTP status, Express, headless
// STRUCTURE: ▶ ┌createDb(':memory:')┐ → ┌ExpenseService(db) + StatsService(db)┐ → ┌createRouter(expService, statsService)┐ → ┌Express app + /api mount┐ → ○ supertest(app) → ◇ GET /transactions 200 ○ POST /transactions 201 ○ POST invalid 400 ○ DELETE 200 ○ GET /balance 200 ○ GET /stats 200 → ⎋ assert

import { describe, it, expect, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDb } from '../src/backend/db.js';
import { ExpenseService } from '../src/backend/expense_service.js';
import { StatsService } from '../src/backend/stats_service.js';
import { createRouter } from '../src/backend/expense_controller.js';
import { updateTestCounter } from './conftest.js';

// region HELPER_createTestApp [DOMAIN(7): Testing; CONCEPT(8): Fixture; TECH(8): Express]
// ## @purpose To create a fully-wired Express application with isolated :memory: DB, both services, and router.
function createTestApp() {
    const db = createDb(':memory:');
    const expenseService = new ExpenseService(db, 'family_1');
    const statsService = new StatsService(db, 'family_1');
    const router = createRouter(expenseService, statsService);
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return { app, db, expenseService, statsService };
}
// endregion HELPER_createTestApp

describe('TransactionController API Tests', () => {
    afterAll(() => {
        updateTestCounter(true);
    });

    // region TEST_GET_empty [DOMAIN(7): Budget; CONCEPT(7): Read; TECH(7): supertest]
    it('GET /api/transactions should return 200 with empty array', async () => {
        const { app } = createTestApp();
        const res = await request(app).get('/api/transactions');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });
    // endregion TEST_GET_empty

    // region TEST_POST_create [DOMAIN(8): Budget; CONCEPT(9): Create; TECH(8): supertest]
    it('POST /api/transactions should return 201 with created transaction', async () => {
        const { app } = createTestApp();
        const res = await request(app)
            .post('/api/transactions')
            .send({ type: 'expense', amount: 500.00, description: 'Тестовый расход' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.type).toBe('expense');
        expect(res.body.amount).toBe(500.00);
        expect(res.body.description).toBe('Тестовый расход');
        expect(res.body.workspace_id).toBe('family_1');
    });
    // endregion TEST_POST_create

    // region TEST_POST_income [DOMAIN(8): Budget; CONCEPT(8): Create; TECH(8): supertest]
    it('POST /api/transactions should create income transaction', async () => {
        const { app } = createTestApp();
        const res = await request(app)
            .post('/api/transactions')
            .send({ type: 'income', amount: 1000.00, description: 'Зарплата' });
        expect(res.status).toBe(201);
        expect(res.body.type).toBe('income');
        expect(res.body.amount).toBe(1000.00);
    });
    // endregion TEST_POST_income

    // region TEST_POST_validation [DOMAIN(9): Budget; CONCEPT(9): Validation; TECH(8): supertest]
    it('POST /api/transactions with invalid data should return 400', async () => {
        const { app } = createTestApp();

        // Missing type
        const res1 = await request(app)
            .post('/api/transactions')
            .send({ amount: 100, description: 'Ошибка' });
        expect(res1.status).toBe(400);
        expect(res1.body).toHaveProperty('error');

        // Invalid type
        const res2 = await request(app)
            .post('/api/transactions')
            .send({ type: 'invalid', amount: 100, description: 'Ошибка' });
        expect(res2.status).toBe(400);

        // Negative amount
        const res3 = await request(app)
            .post('/api/transactions')
            .send({ type: 'expense', amount: -100, description: 'Отрицательно' });
        expect(res3.status).toBe(400);

        // Empty description
        const res4 = await request(app)
            .post('/api/transactions')
            .send({ type: 'expense', amount: 100, description: '' });
        expect(res4.status).toBe(400);
    });
    // endregion TEST_POST_validation

    // region TEST_DELETE [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): supertest]
    it('DELETE /api/transactions/:id should return 200 with success', async () => {
        const { app } = createTestApp();
        const createRes = await request(app)
            .post('/api/transactions')
            .send({ type: 'expense', amount: 100.00, description: 'Удалить' });
        expect(createRes.status).toBe(201);
        const id = createRes.body.id;

        const deleteRes = await request(app).delete(`/api/transactions/${id}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body).toEqual({ success: true });

        const getRes = await request(app).get('/api/transactions');
        expect(getRes.body.length).toBe(0);
    });
    // endregion TEST_DELETE

    // region TEST_DELETE_nonexistent [DOMAIN(7): Budget; CONCEPT(7): Delete; TECH(6): supertest]
    it('DELETE /api/transactions/:id for non-existent id should return 200', async () => {
        const { app } = createTestApp();
        const res = await request(app).delete('/api/transactions/99999');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
    });
    // endregion TEST_DELETE_nonexistent

    // region TEST_GET_after_create [DOMAIN(8): Budget; CONCEPT(8): Integration; TECH(7): supertest]
    it('GET /api/transactions should return created records in DESC order', async () => {
        const { app } = createTestApp();
        await request(app).post('/api/transactions').send({ type: 'expense', amount: 100, description: 'Один' });
        await request(app).post('/api/transactions').send({ type: 'expense', amount: 200, description: 'Два' });

        const res = await request(app).get('/api/transactions');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].description).toBe('Два');
    });
    // endregion TEST_GET_after_create

    // region TEST_get_balance [DOMAIN(8): Budget; CONCEPT(8): Read; TECH(7): supertest]
    it('GET /api/balance should return balance with income and expenses', async () => {
        const { app } = createTestApp();
        // Add income: 1000
        await request(app).post('/api/transactions').send({ type: 'income', amount: 1000, description: 'Зарплата' });
        // Add expenses: 300 + 200 = 500
        await request(app).post('/api/transactions').send({ type: 'expense', amount: 300, description: 'Продукты' });
        await request(app).post('/api/transactions').send({ type: 'expense', amount: 200, description: 'Такси' });

        const res = await request(app).get('/api/balance');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('balance');
        expect(res.body.balance).toBe(500); // 1000 - 300 - 200
    });
    // endregion TEST_get_balance

    // region TEST_get_stats [DOMAIN(8): Budget; CONCEPT(8): Read; TECH(7): supertest]
    it('GET /api/stats should return stats object with period breakdown', async () => {
        const { app } = createTestApp();
        await request(app).post('/api/transactions').send({ type: 'expense', amount: 500, description: 'Продукты' });

        const res = await request(app).get('/api/stats');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('today');
        expect(res.body).toHaveProperty('yesterday');
        expect(res.body).toHaveProperty('this_week');
        expect(res.body).toHaveProperty('this_month');
        expect(res.body.today).toBe(500); // только что созданный расход
    });
    // endregion TEST_get_stats
});
