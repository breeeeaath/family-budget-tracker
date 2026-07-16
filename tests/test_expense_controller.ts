// region MODULE_CONTRACT [DOMAIN(8): Budget; CONCEPT(9): APITesting, Headless; TECH(9): vitest, supertest, Express]
// ## @modulecontract
// ## @purpose To verify Express route handlers for the expense API using supertest without starting a real HTTP server, ensuring correct HTTP status codes and response bodies.
// ## @scope Headless tests for GET /api/expenses, POST /api/expenses, DELETE /api/expenses/:id with valid and invalid inputs.
// ## @input None (creates fresh :memory: database and Express app per test).
// ## @output Test results with HTTP status and body assertions.
// ## @links [USES_API(9): supertest; CALLS_CLASS: ExpenseService, createRouter; USES: conftest.ts/AntiLoop]
// ## @invariants
// ## - Every test creates its own Express app with fresh DB.
// ## - Tests verify both success (200/201) and error (400/500) paths.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of controller API tests]
// ## @modulemap
// ## FUNC 9[Test: GET returns 200 with array] => test_get_expenses
// ## FUNC 9[Test: POST creates and returns 201] => test_create_expense
// ## FUNC 8[Test: POST with invalid data returns 400] => test_create_invalid
// ## FUNC 8[Test: DELETE returns 200 with success] => test_delete_expense
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: tests, API, supertest, controller, GET, POST, DELETE, HTTP status, Express, headless
// STRUCTURE: ▶ ┌createDb(':memory:')┐ → ┌ExpenseService(db)┐ → ┌createRouter(service)┐ → ┌Express app + /api mount┐ → ○ supertest(app) → ◇ GET 200 ○ POST 201 ○ POST 400 ○ DELETE 200 → ⎋ assert status + body

// BUG_FIX_CONTEXT: QA-аудит: Anti-Loop Protocol не подключён. updateTestCounter импортирован, но не вызывался.
// Добавлен afterAll с вызовом updateTestCounter для активации счётчика попыток.
import { describe, it, expect, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDb } from '../src/backend/db.js';
import { ExpenseService } from '../src/backend/expense_service.js';
import { createRouter } from '../src/backend/expense_controller.js';
import { updateTestCounter } from './conftest.js';

// region HELPER_createTestApp [DOMAIN(7): Testing; CONCEPT(8): Fixture; TECH(8): Express]
// ## @purpose To create a fully-wired Express application for each test, using an isolated :memory: database.
function createTestApp() {
    const db = createDb(':memory:');
    const service = new ExpenseService(db, 'family_1');
    const router = createRouter(service);
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return { app, db, service };
}
// endregion HELPER_createTestApp

describe('ExpenseController API Tests', () => {
    // BUG_FIX_CONTEXT: QA-аудит: добавлен afterAll с вызовом updateTestCounter для активации Anti-Loop Protocol.
    // BUG_FIX_CONTEXT v2: expect.getState() в afterAll ненадёжен в vitest. Безусловный reset (true):
    // счётчик сбрасывается в 0 после каждого успешного выполнения afterAll.
    afterAll(() => {
        updateTestCounter(true);
    });

    // region TEST_GET_empty [DOMAIN(7): Budget; CONCEPT(7): Read; TECH(7): supertest]
    it('GET /api/expenses should return 200 with empty array', async () => {
        const { app } = createTestApp();
        const res = await request(app).get('/api/expenses');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });
    // endregion TEST_GET_empty

    // region TEST_POST_create [DOMAIN(8): Budget; CONCEPT(9): Create; TECH(8): supertest]
    it('POST /api/expenses should return 201 with created expense', async () => {
        const { app } = createTestApp();
        const res = await request(app)
            .post('/api/expenses')
            .send({ amount: 500.00, description: 'Тестовый расход' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.amount).toBe(500.00);
        expect(res.body.description).toBe('Тестовый расход');
        expect(res.body.workspace_id).toBe('family_1');
    });
    // endregion TEST_POST_create

    // region TEST_POST_validation [DOMAIN(9): Budget; CONCEPT(9): Validation; TECH(8): supertest]
    it('POST /api/expenses with invalid data should return 400', async () => {
        const { app } = createTestApp();

        // Missing amount
        const res1 = await request(app)
            .post('/api/expenses')
            .send({ description: 'Ошибка' });
        expect(res1.status).toBe(400);
        expect(res1.body).toHaveProperty('error');

        // Negative amount
        const res2 = await request(app)
            .post('/api/expenses')
            .send({ amount: -100, description: 'Отрицательно' });
        expect(res2.status).toBe(400);
        expect(res2.body).toHaveProperty('error');

        // Empty description
        const res3 = await request(app)
            .post('/api/expenses')
            .send({ amount: 100, description: '' });
        expect(res3.status).toBe(400);
        expect(res3.body).toHaveProperty('error');
    });
    // endregion TEST_POST_validation

    // region TEST_DELETE [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): supertest]
    it('DELETE /api/expenses/:id should return 200 with success', async () => {
        const { app } = createTestApp();
        // First create an expense to delete
        const createRes = await request(app)
            .post('/api/expenses')
            .send({ amount: 100.00, description: 'Удалить' });
        expect(createRes.status).toBe(201);
        const id = createRes.body.id;

        // Delete it
        const deleteRes = await request(app).delete(`/api/expenses/${id}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body).toEqual({ success: true });

        // Verify it's gone
        const getRes = await request(app).get('/api/expenses');
        expect(getRes.body.length).toBe(0);
    });
    // endregion TEST_DELETE

    // region TEST_DELETE_nonexistent [DOMAIN(7): Budget; CONCEPT(7): Delete; TECH(6): supertest]
    it('DELETE /api/expenses/:id for non-existent id should return 200', async () => {
        const { app } = createTestApp();
        const res = await request(app).delete('/api/expenses/99999');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
    });
    // endregion TEST_DELETE_nonexistent

    // region TEST_GET_after_create [DOMAIN(8): Budget; CONCEPT(8): Integration; TECH(7): supertest]
    it('GET /api/expenses should return created records', async () => {
        const { app } = createTestApp();
        await request(app).post('/api/expenses').send({ amount: 100, description: 'Один' });
        await request(app).post('/api/expenses').send({ amount: 200, description: 'Два' });

        const res = await request(app).get('/api/expenses');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].description).toBe('Два'); // DESC order
    });
    // endregion TEST_GET_after_create
});
