// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): API, Routing, ErrorHandling; TECH(9): Express, TypeScript]
// ## @modulecontract
// ## @purpose To define Express route handlers for expense CRUD operations, acting as a thin HTTP adapter between the client and the ExpenseService business layer.
// ## @scope HTTP request parsing, response formatting, error boundary for 500 errors.
// ## @input An ExpenseService instance.
// ## @output An Express Router with GET/POST/DELETE /expenses endpoints mounted under /api.
// ## @links [USES_API(9): Express/Router; CALLS_CLASS: ExpenseService]
// ## @invariants
// ## - All routes catch errors and return 500 with `{ error: 'Internal server error' }`.
// ## - POST route returns 201 on success, 400 on validation error.
// ## - DELETE route always returns `{ success: true }` even if no row was deleted (existing behavior).
// ## @rationale
// ## Q: Why a factory function (createRouter) instead of a class?
// ## A: Express Router is already a natural grouping mechanism. A factory function is simpler and more idiomatic for Express route definitions.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of expense router with error handling]
// ## @modulemap
// ## FUNC 9[Creates Express Router for /expenses endpoints] => createRouter
// ## @usecases
// ## - [createRouter]: server.ts → createRouter(service) → Mount at /api
// ## - [GET /expenses]: Client → getAll → JSON array
// ## - [POST /expenses]: Client → create → 201 + JSON object
// ## - [DELETE /expenses/:id]: Client → delete → { success: true }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: Express, router, API, controller, expenses, GET, POST, DELETE, error handling
// STRUCTURE: ▶ createRouter(service) → ○ ┌GET /expenses┐: service.getAll() → res.json() → ◇ ┌POST /expenses┐: try → service.create() → 201 || catch(400) → ◇ ┌DELETE /expenses/:id┐: service.delete(id) → {success} → ⎋ Router

import { Router, Request, Response } from 'express';
import { ExpenseService } from './expense_service.js';

// region FUNC_createRouter [DOMAIN(8): Budget; CONCEPT(9): Routing; TECH(9): Express]
// ## @purpose To construct and return an Express Router instance pre-configured with all expense endpoints, ready to be mounted by the server entry point.
// ## @uses Express.Router, ExpenseService
// ## @io [ExpenseService] -> [Router]
// ## @complexity 7
export function createRouter(expenseService: ExpenseService): Router {
    const router = Router();
    console.log(`[IMP:6][createRouter][INIT] Router created [FLOW]`);

    // region ROUTE_GET /expenses [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): Express]
    // ## @purpose To handle GET requests for the expense list, delegating to ExpenseService.getAll and returning a JSON array of the latest 50 expenses.
    router.get('/expenses', (req: Request, res: Response) => {
        console.log(`[IMP:5][createRouter][GET] Handling GET /expenses [FLOW]`);
        try {
            const expenses = expenseService.getAll();
            console.log(`[IMP:7][createRouter][GET] Returning ${expenses.length} expenses [IO]`);
            res.json(expenses);
        } catch (error) {
            console.error(`[IMP:10][createRouter][GET] CRITICAL: Error in GET /expenses [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_GET

    // region ROUTE_POST /expenses [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(8): Express]
    // ## @purpose To parse the request body, delegate to ExpenseService.create, and return the newly created expense with HTTP 201 status. Validation errors from the service are caught and re-mapped to 400.
    router.post('/expenses', (req: Request, res: Response) => {
        const { amount, description } = req.body;
        console.log(`[IMP:5][createRouter][POST] Handling POST /expenses: amount=${amount}, description='${description}' [FLOW]`);
        try {
            const newExpense = expenseService.create(Number(amount), description);
            console.log(`[IMP:9][createRouter][POST] Created expense id=${newExpense.id}, returning 201 [BUSINESS]`);
            res.status(201).json(newExpense);
        } catch (error: any) {
            if (error instanceof Error && error.message.startsWith('Validation failed')) {
                console.log(`[IMP:9][createRouter][POST] Validation error: ${error.message} [BUSINESS]`);
                res.status(400).json({ error: error.message });
            } else {
                console.error(`[IMP:10][createRouter][POST] CRITICAL: Error in POST /expenses [FATAL]`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    // endregion ROUTE_POST

    // region ROUTE_DELETE /expenses/:id [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Express]
    // ## @purpose To handle DELETE requests for a specific expense by id, delegating to ExpenseService.delete and returning a success confirmation.
    router.delete('/expenses/:id', (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        console.log(`[IMP:5][createRouter][DELETE] Handling DELETE /expenses/${id} [FLOW]`);
        try {
            const deleted = expenseService.delete(id);
            console.log(`[IMP:7][createRouter][DELETE] Deleted expense id=${id}, deleted=${deleted} [IO]`);
            res.json({ success: true });
        } catch (error) {
            console.error(`[IMP:10][createRouter][DELETE] CRITICAL: Error in DELETE /expenses/${req.params.id} [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_DELETE

    console.log(`[IMP:6][createRouter][READY] Routes mounted: GET /expenses, POST /expenses, DELETE /expenses/:id [FLOW]`);
    return router;
}
// endregion FUNC_createRouter
