// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): EntryPoint, ServerInit; TECH(9): Express, Vite, TypeScript]
// ## @modulecontract
// ## @purpose To serve as the single entry point of the Family Budget Tracker application вЂ” initializes the database, business logic layer, HTTP router, and Vite dev middleware, then starts the Express HTTP server.
// ## @scope Application bootstrap: DB init, service init, router mount, Vite middleware, server listen.
// ## @input None (reads process.cwd() for data directory, process.env.NODE_ENV for production mode).
// ## @output Running HTTP server on port 3000.
// ## @links [CALLS_FUNCTION: src/backend/db/createDb; CALLS_CLASS: src/backend/expense_service/ExpenseService; CALLS_FUNCTION: src/backend/expense_controller/createRouter; USES_API: Express, Vite]
// ## @invariants
// ## - Server ALWAYS listens on process.env.PORT (default 3000 for local dev, 8080 on Cloud Run).
// ## - In development mode, Vite middleware is attached for HMR.
// ## - In production mode, static files from dist/ are served.
// ## @rationale
// ## Q: Why keep all initialization in server.ts instead of a separate init module?
// ## A: This is the application composition root. Keeping all wiring in one place makes the dependency graph explicit and easy to understand for agents.
// ## @changes
// ## LAST_CHANGE: [v1.0.1 — PORT from process.env: Cloud Run compatibility]
// ## LAST_CHANGE: [v1.0.0 — Refactored: extracted db, service, controller into separate modules with DI]
// ## @modulemap
// ## FUNC 10[Initialize and start Express server with all layers] => startServer
// ## @usecases
// ## - [startServer]: Developer (npm run dev) в†’ startServer в†’ Running dev server at :3000
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: entry point, server, Express, Vite, bootstrap, init, composition root
// STRUCTURE: ▶ startServer() → ┌createDb()┐ → ┌new ExpenseService(db)┐ → ┌createRouter(service)┐ → ◇ dev? ┌Vite middleware (dynamic import)┐ || prod? ┌static dist┐ → app.listen(PORT|env) → ⎋ running

import express from "express";
import path from "path";
import { createDb } from "./src/backend/db.js";
import { ExpenseService } from "./src/backend/expense_service.js";
import { createRouter } from "./src/backend/expense_controller.js";

// region FUNC_startServer [DOMAIN(9): Budget; CONCEPT(9): Bootstrap; TECH(9): Express, Vite]
// ## @purpose To wire together all application layers (database, business logic, HTTP routing, Vite dev server) and start listening for HTTP requests.
// ## @uses Express, Vite, createDb, ExpenseService, createRouter
// ## @io [] -> [Promise<void>]
// ## @complexity 7
async function startServer() {
    console.log(`[IMP:6][startServer] Initializing server... [FLOW]`);

    // Initialize layers
    const db = createDb();
    const expenseService = new ExpenseService(db);
    const router = createRouter(expenseService);

    const app = express();
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    app.use(express.json());

    // Mount API routes at /api
    // Router contains /expenses, /api/expenses, etc.
    app.use('/api', router);
    console.log(`[IMP:7][startServer] API routes mounted at /api [IO]`);

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
