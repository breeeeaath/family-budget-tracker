// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): API, Routing, ErrorHandling; TECH(9): Express, TypeScript]
// ## @modulecontract
// ## @purpose To define Express route handlers for transaction CRUD operations, balance retrieval, and statistics, acting as a thin HTTP adapter between the client and the ExpenseService/StatsService business layers.
// ## @scope HTTP request parsing, response formatting, error boundary for 400 and 500 errors.
// ## @input An ExpenseService instance and a StatsService instance.
// ## @output An Express Router with GET/POST/DELETE /transactions, GET /balance, GET /stats endpoints mounted under /api. Backward-compatible /expenses aliases are also registered.
// ## @links [USES_API(9): Express/Router; CALLS_CLASS: ExpenseService; CALLS_CLASS: StatsService]
// ## @invariants
// ## - All routes catch errors and return 500 with `{ error: 'Internal server error' }`.
// ## - POST route returns 201 on success, 400 on validation error.
// ## - DELETE route always returns `{ success: true }` even if no row was deleted.
// ## - GET /balance always returns `{ balance: number }`.
// ## - GET /stats always returns `{ today, yesterday, this_week, this_month }`.
// ## @rationale
// ## Q: Why pass both ExpenseService and StatsService to createRouter?
// ## A: The balance and stats endpoints need both services. Keeping all transaction-related routes in one router maintains a cohesive API surface.
// ## Q: Why keep /expenses as an alias?
// ## A: Backward compatibility for existing clients that may still use the old endpoint path.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Extended router: /transactions routes, /balance, /stats. Added StatsService DI. Backward-compat /expenses aliases.]
// ## @modulemap
// ## FUNC 9[Creates Express Router for /transactions, /balance, /stats endpoints] => createRouter
// ## @usecases
// ## - [createRouter]: server.ts -> createRouter(expenseService, statsService) -> Mount at /api
// ## - [GET /transactions]: Client -> getAll -> JSON array with categories
// ## - [POST /transactions]: Client -> create(type, amount, desc, category_id) -> 201 + JSON object
// ## - [DELETE /transactions/:id]: Client -> delete -> { success: true }
// ## - [GET /balance]: Client -> balance -> { balance: number }
// ## - [GET /stats]: Client -> stats -> { today, yesterday, this_week, this_month }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: Express, router, API, controller, transactions, balance, stats, GET, POST, DELETE, error handling, backward compat
// STRUCTURE: ▶ createRouter(expenseService, statsService) → ○ ┌GET /transactions┐: getAll() → res.json() → ◇ ┌POST /transactions┐: try → create(type,amount,desc,category_id?) → 201 || catch(400) → ◇ ┌DELETE /transactions/:id┐: delete(id) → {success} → ◇ ┌GET /balance┐: expenseService.getBalance() + statsService.getOpeningBalance() → {balance} → ◇ ┌GET /stats┐: statsService.getStats() → res.json() → ◇ ┌/expenses aliases (backward compat)┐ → ⎋ Router

import { Router, Request, Response } from 'express';
import { ExpenseService } from './expense_service.js';
import { StatsService } from './stats_service.js';

// region FUNC_createRouter [DOMAIN(8): Budget; CONCEPT(9): Routing; TECH(9): Express]
// ## @purpose To construct and return an Express Router instance pre-configured with all transaction, balance, and statistics endpoints, ready to be mounted by the server entry point. Includes backward-compatible /expenses aliases.
// ## @uses Express.Router, ExpenseService, StatsService
// ## @io [ExpenseService, StatsService] -> [Router]
// ## @complexity 8
export function createRouter(expenseService: ExpenseService, statsService: StatsService): Router {
    const router = Router();
    console.log(`[IMP:6][createRouter][INIT] Router created with ExpenseService and StatsService [FLOW]`);

    // ============ /transactions endpoints ============

    // region ROUTE_GET /transactions [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): Express]
    // ## @purpose To handle GET requests for the transaction list, delegating to ExpenseService.getAll and returning a JSON array of the latest 50 transactions with category info.
    router.get('/transactions', (req: Request, res: Response) => {
        console.log(`[IMP:5][createRouter][GET] Handling GET /transactions [FLOW]`);
        try {
            const transactions = expenseService.getAll();
            console.log(`[IMP:7][createRouter][GET] Returning ${transactions.length} transactions [IO]`);
            res.json(transactions);
        } catch (error) {
            console.error(`[IMP:10][createRouter][GET] CRITICAL: Error in GET /transactions [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_GET

    // region ROUTE_POST /transactions [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(8): Express]
    // ## @purpose To parse the request body (type, amount, description, category_id), delegate to ExpenseService.create, and return the newly created transaction with HTTP 201 status. Validation errors from the service are caught and re-mapped to 400.
    router.post('/transactions', (req: Request, res: Response) => {
        const { type, amount, description, category_id } = req.body;
        console.log(`[IMP:5][createRouter][POST] Handling POST /transactions: type=${type}, amount=${amount}, description='${description}', category_id=${category_id} [FLOW]`);
        try {
            const newTransaction = expenseService.create(type, Number(amount), description, category_id != null ? Number(category_id) : null);
            console.log(`[IMP:9][createRouter][POST] Created transaction id=${newTransaction.id}, returning 201 [BUSINESS]`);
            res.status(201).json(newTransaction);
        } catch (error: any) {
            if (error instanceof Error && error.message.startsWith('Validation failed')) {
                console.log(`[IMP:9][createRouter][POST] Validation error: ${error.message} [BUSINESS]`);
                res.status(400).json({ error: error.message });
            } else {
                console.error(`[IMP:10][createRouter][POST] CRITICAL: Error in POST /transactions [FATAL]`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    // endregion ROUTE_POST

    // region ROUTE_DELETE /transactions/:id [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Express]
    // ## @purpose To handle DELETE requests for a specific transaction by id, delegating to ExpenseService.delete and returning a success confirmation.
    router.delete('/transactions/:id', (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        console.log(`[IMP:5][createRouter][DELETE] Handling DELETE /transactions/${id} [FLOW]`);
        try {
            const deleted = expenseService.delete(id);
            console.log(`[IMP:7][createRouter][DELETE] Deleted transaction id=${id}, deleted=${deleted} [IO]`);
            res.json({ success: true });
        } catch (error) {
            console.error(`[IMP:10][createRouter][DELETE] CRITICAL: Error in DELETE /transactions/${req.params.id} [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_DELETE

    // ============ /balance endpoint ============

    // region ROUTE_GET /balance [DOMAIN(9): Budget; CONCEPT(9): Balance; TECH(7): Express]
    // ## @purpose To handle GET requests for the current balance, combining the net transaction balance from ExpenseService with the monthly opening balance from StatsService. Returns `{ balance: number }`.
    router.get('/balance', (req: Request, res: Response) => {
        console.log(`[IMP:5][createRouter][BALANCE] Handling GET /balance [FLOW]`);
        try {
            const netBalance = expenseService.getBalance();
            const openingBalance = statsService.getOpeningBalance();
            const totalBalance = netBalance + openingBalance;
            console.log(`[IMP:7][createRouter][BALANCE] netBalance=${netBalance}, openingBalance=${openingBalance}, total=${totalBalance} [IO]`);
            console.log(`[IMP:9][createRouter][BALANCE] Balance computed: ${totalBalance} [BUSINESS]`);
            res.json({ balance: totalBalance });
        } catch (error) {
            console.error(`[IMP:10][createRouter][BALANCE] CRITICAL: Error in GET /balance [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_BALANCE

    // ============ /stats endpoint ============

    // region ROUTE_GET /stats [DOMAIN(8): Budget; CONCEPT(9): Statistics; TECH(7): Express]
    // ## @purpose To handle GET requests for period-based expense statistics, delegating to StatsService.getStats and returning today/yesterday/week/month totals.
    router.get('/stats', (req: Request, res: Response) => {
        console.log(`[IMP:5][createRouter][STATS] Handling GET /stats [FLOW]`);
        try {
            const stats = statsService.getStats();
            console.log(`[IMP:7][createRouter][STATS] Stats: ${JSON.stringify(stats)} [IO]`);
            console.log(`[IMP:9][createRouter][STATS] Stats computed successfully [BUSINESS]`);
            res.json(stats);
        } catch (error) {
            console.error(`[IMP:10][createRouter][STATS] CRITICAL: Error in GET /stats [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_STATS

    // ============ Backward-compatible /expenses aliases ============

    // region ROUTE_GET /expenses (backward compat) [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): Express]
    // ## @purpose Alias for GET /transactions — maintains backward compatibility with existing clients.
    router.get('/expenses', (req: Request, res: Response) => {
        console.log(`[IMP:5][createRouter][GET] Handling GET /expenses (backward compat) [FLOW]`);
        try {
            const transactions = expenseService.getAll();
            console.log(`[IMP:7][createRouter][GET] Returning ${transactions.length} transactions (from /expenses compat) [IO]`);
            res.json(transactions);
        } catch (error) {
            console.error(`[IMP:10][createRouter][GET] CRITICAL: Error in GET /expenses [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_GET_EXPENSES

    // region ROUTE_POST /expenses (backward compat) [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(8): Express]
    // ## @purpose Alias for POST /transactions — maintains backward compatibility. Creates expense-type transactions when called via the old endpoint.
    router.post('/expenses', (req: Request, res: Response) => {
        const { amount, description } = req.body;
        console.log(`[IMP:5][createRouter][POST] Handling POST /expenses (backward compat): amount=${amount}, description='${description}' [FLOW]`);
        try {
            const newTransaction = expenseService.create('expense', Number(amount), description, null);
            console.log(`[IMP:9][createRouter][POST] Created transaction id=${newTransaction.id} via /expenses compat, returning 201 [BUSINESS]`);
            res.status(201).json(newTransaction);
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
    // endregion ROUTE_POST_EXPENSES

    // region ROUTE_DELETE /expenses/:id (backward compat) [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Express]
    // ## @purpose Alias for DELETE /transactions/:id — maintains backward compatibility with existing clients.
    router.delete('/expenses/:id', (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        console.log(`[IMP:5][createRouter][DELETE] Handling DELETE /expenses/${id} (backward compat) [FLOW]`);
        try {
            const deleted = expenseService.delete(id);
            console.log(`[IMP:7][createRouter][DELETE] Deleted transaction id=${id} via /expenses compat, deleted=${deleted} [IO]`);
            res.json({ success: true });
        } catch (error) {
            console.error(`[IMP:10][createRouter][DELETE] CRITICAL: Error in DELETE /expenses/${req.params.id} [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_DELETE_EXPENSES

    console.log(`[IMP:6][createRouter][READY] Routes mounted: GET/POST/DELETE /transactions, GET /balance, GET /stats, backward-compat /expenses [FLOW]`);
    return router;
}
// endregion FUNC_createRouter
