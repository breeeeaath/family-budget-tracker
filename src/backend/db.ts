// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): DatabaseConnection, SchemaInit; TECH(9): better-sqlite3, SQLite]
// ## @modulecontract
// ## @purpose To provide a single, reusable entry point for creating a SQLite database connection with a pre-defined expenses schema, ensuring consistent persistence setup across the application.
// ## @scope Database connection creation, schema initialization, directory provisioning.
// ## @input Optional dbPath string — if omitted, defaults to `data/tracker.db` relative to cwd.
// ## @output An open better-sqlite3 Database instance with the `expenses` table created.
// ## @links [USES_API(9): better-sqlite3; USES_API(6): fs, path]
// ## @invariants
// ## - createDb ALWAYS returns a valid, open Database instance.
// ## - The `expenses` table ALWAYS exists after createDb returns.
// ## - If dbPath is provided as ':memory:', no data directory is created.
// ## @rationale
// ## Q: Why use a factory function instead of a singleton?
// ## A: A factory function allows test isolation via ':memory:' databases and avoids module-level state that would persist across tests.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of database module with schema init]
// ## @modulemap
// ## FUNC 9[Creates and returns configured SQLite Database] => createDb
// ## @usecases
// ## - [createDb]: Server (Startup) → createDb → Ready Database
// ## - [createDb]: Test (Setup) → createDb(':memory:') → Isolated Database
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: database, SQLite, better-sqlite3, expenses, schema, createDb, persistence
// STRUCTURE: ▶ ┌dbPath:String┐ → ◇ `:memory:`? No → ∑ mkdirSync(dataDir) → ⚡ db.prepare(CREATE TABLE).run() → ⎋ return Database

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// region FUNC_createDb [DOMAIN(8): Budget; CONCEPT(9): DatabaseInit; TECH(9): better-sqlite3]
// ## @purpose To enable any caller (server startup, test fixture) to obtain a ready-to-use SQLite connection with a guaranteed schema, without worrying about directory creation or table existence.
// ## @uses better-sqlite3, fs, path
// ## @io [optional string] -> [Database]
// ## @complexity 5
export function createDb(dbPath?: string): Database {
    // === LOG DRIVEN DEVELOPMENT 2.0 (LDD) INSTRUCTIONS ===
    // 1. STRICT LOG LINE FORMAT:
    // f"[IMP:{1-10}][{FUNCTION_NAME}][{BLOCK_NAME}] Description"
    // 2. IMPORTANCE (IMP) SCALE:
    // - [IMP:1-3] (Trace): Local variable dumps in loops.
    // - [IMP:4-6] (Flow): Start/end of steps, internal function calls, branching.
    // - [IMP:7-8] (I/O & Boundary): DB access, API calls, file reads.
    // - [IMP:9-10] (Business Logic & AI Belief): Hypothesis testing, goal achievement, critical errors.
    // 3. EXCEPTION ENRICHMENT: In complex functions, output local context at IMP:10 on failure.

    const resolvedPath: string = dbPath ?? path.join(process.cwd(), 'data', 'tracker.db');
    console.log(`[IMP:6][createDb][INIT] Resolved dbPath: ${resolvedPath} [FLOW]`);

    // If not in-memory, ensure parent directory exists
    if (resolvedPath !== ':memory:') {
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[IMP:7][createDb][DIR] Created data directory: ${dir} [IO]`);
        }
    }

    const db = new Database(resolvedPath);
    console.log(`[IMP:7][createDb][OPEN] Database opened at ${resolvedPath} [IO]`);

    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');

    // Create expenses table if it does not exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            workspace_id TEXT DEFAULT 'family_1',
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log(`[IMP:7][createDb][SCHEMA] Expenses table ensured [IO]`);

    console.log(`[IMP:9][createDb][RESULT] Database ready at ${resolvedPath} [BUSINESS]`);
    return db;
}
// endregion FUNC_createDb
