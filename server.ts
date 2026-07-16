// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): EntryPoint, ServerInit; TECH(9): Express, Vite, TypeScript]
// ## @modulecontract
// ## @purpose To serve as the single entry point of the Family Budget Tracker application — initializes the database, all business logic services, HTTP routers, and Vite dev middleware, then starts the Express HTTP server.
// ## @scope Application bootstrap: DB init, service init (ExpenseService, CategoryService, StatsService), router mount, Vite middleware, server listen.
// ## @input None (reads process.cwd() for data directory, process.env.NODE_ENV for production mode).
// ## @output Running HTTP server on port 3000 with fully initialized API.
// ## @links [CALLS_FUNCTION: src/backend/db/createDb; CALLS_CLASS: src/backend/expense_service/ExpenseService; CALLS_CLASS: src/backend/category_service/CategoryService; CALLS_CLASS: src/backend/stats_service/StatsService; CALLS_FUNCTION: src/backend/expense_controller/createRouter; CALLS_FUNCTION: src/backend/category_controller/createCategoryRouter; USES_API: Express, Vite]
// ## @invariants
// ## - Server ALWAYS listens on process.env.PORT (default 3000 for local dev, 8080 on Cloud Run).
// ## - In development mode, Vite middleware is attached for HMR.
// ## - In production mode, static files from dist/ are served.
// ## - All three services (ExpenseService, CategoryService, StatsService) are initialized from the same db instance.
// ## @rationale
// ## Q: Why keep all initialization in server.ts instead of a separate init module?
// ## A: This is the application composition root. Keeping all wiring in one place makes the dependency graph explicit and easy to understand for agents.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 — Added CategoryService, StatsService, category router. Updated createRouter signature with StatsService DI.]
// ## LAST_CHANGE: [v1.0.1 — PORT from process.env: Cloud Run compatibility]
// ## LAST_CHANGE: [v1.0.0 — Refactored: extracted db, service, controller into separate modules with DI]
// ## @modulemap
// ## FUNC 10[Initialize and start Express server with all layers] => startServer
// ## @usecases
// ## - [startServer]: Developer (npm run dev) -> startServer -> Running dev server at :3000
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: entry point, server, Express, Vite, bootstrap, init, composition root, ExpenseService, CategoryService, StatsService
// STRUCTURE: ▶ startServer() → ┌createDb()┐ → ┌new ExpenseService(db)┐ ⊕ ┌new CategoryService(db)┐ ⊕ ┌new StatsService(db)┐ → ┌createRouter(expenseService, statsService)┐ ⊕ ┌createCategoryRouter(categoryService)┐ → ◇ dev? ┌Vite middleware (dynamic import)┐ || prod? ┌static dist┐ → app.listen(PORT|env) → ⎋ running

import express from "express";
import path from "path";
import { createDb } from "./src/backend/db.js";
import { ExpenseService } from "./src/backend/expense_service.js";
import { CategoryService } from "./src/backend/category_service.js";
import { StatsService } from "./src/backend/stats_service.js";
import { createRouter } from "./src/backend/expense_controller.js";
import { createCategoryRouter } from "./src/backend/category_controller.js";

// region FUNC_startServer [DOMAIN(9): Budget; CONCEPT(9): Bootstrap; TECH(9): Express, Vite]
// ## @purpose To wire together all application layers (database, business logic services, HTTP routing, Vite dev server) and start listening for HTTP requests.
// ## @uses Express, Vite, createDb, ExpenseService, CategoryService, StatsService, createRouter, createCategoryRouter
// ## @io [] -> [Promise<void>]
// ## @complexity 8
async function startServer() {
    console.log(`[IMP:6][startServer] Initializing server... [FLOW]`);

    // === Initialize database ===
    const db = createDb();

    // === Initialize business logic services ===
    const expenseService = new ExpenseService(db);
    console.log(`[IMP:6][startServer] ExpenseService initialized [FLOW]`);

    const categoryService = new CategoryService(db);
    console.log(`[IMP:6][startServer] CategoryService initialized [FLOW]`);

    const statsService = new StatsService(db);
    console.log(`[IMP:6][startServer] StatsService initialized [FLOW]`);

    // === Create routers ===
    const transactionRouter = createRouter(expenseService, statsService);
    const categoryRouter = createCategoryRouter(categoryService);

    const app = express();
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    app.use(express.json());

    // Mount API routes at /api
    app.use('/api', transactionRouter);
    app.use('/api/categories', categoryRouter);
    console.log(`[IMP:7][startServer] API routes mounted: /api/transactions, /api/balance, /api/stats, /api/categories [IO]`);

    // BUG_FIX_CONTEXT: v1.0.1 — Static import of 'vite' crashes in production (vite is a devDependency,
    // not installed in the runtime image). Dynamic import inside the dev-only branch ensures
    // require('vite') is never evaluated in production mode.
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        console.log(`[IMP:6][startServer] Setting up Vite dev middleware [FLOW]`);
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`[IMP:9][startServer] Server running on http://0.0.0.0:${PORT} [BUSINESS]`);
    });
}
// endregion FUNC_startServer

startServer();
