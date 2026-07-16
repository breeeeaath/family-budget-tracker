// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): DatabaseConnection, SchemaInit; TECH(9): better-sqlite3, SQLite]
// ## @modulecontract
// ## @purpose To provide a single, reusable entry point for creating a SQLite database connection with an extended schema (categories, transactions, monthly_balance), ensuring consistent persistence setup and automatic data migration from legacy schema.
// ## @scope Database connection creation, schema initialization, directory provisioning, legacy data migration, default category seeding.
// ## @input Optional dbPath string — if omitted, defaults to `data/tracker.db` relative to cwd.
// ## @output An open better-sqlite3 Database instance with `transactions`, `categories`, and `monthly_balance` tables created and default categories inserted.
// ## @links [USES_API(9): better-sqlite3; USES_API(6): fs, path]
// ## @invariants
// ## - createDb ALWAYS returns a valid, open Database instance.
// ## - The `transactions`, `categories`, and `monthly_balance` tables ALWAYS exist after createDb returns.
// ## - If an old `expenses` table exists, its data is migrated to `transactions` and `expenses` is dropped.
// ## - 21 default categories are inserted if the `categories` table is empty.
// ## - If dbPath is provided as ':memory:', no data directory is created.
// ## @rationale
// ## Q: Why use a factory function instead of a singleton?
// ## A: A factory function allows test isolation via ':memory:' databases and avoids module-level state that would persist across tests.
// ## Q: Why embed default category seeding in the DB module?
// ## A: Guarantees categories exist for any consumer of the database, including tests, without requiring an external seeding script.
// ## Q: Why soft-migrate via IF NOT EXISTS + conditional INSERT?
// ## A: Enables idempotent re-runs; the module can be called multiple times without duplicating data or failing on re-creation.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Extended schema: categories, transactions (replaces expenses), monthly_balance, migration, default categories]
// ## @modulemap
// ## FUNC 9[Creates and returns configured SQLite Database] => createDb
// ## @usecases
// ## - [createDb]: Server (Startup) -> createDb -> Ready Database with all tables
// ## - [createDb]: Test (Setup) -> createDb(':memory:') -> Isolated Database
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: database, SQLite, better-sqlite3, transactions, categories, monthly_balance, migration, createDb, persistence, schema
// STRUCTURE: ▶ ┌dbPath:String┐ → ◇ `:memory:`? No → ∑ mkdirSync(dataDir) → ⚡ CREATE TABLE IF NOT EXISTS categories → ⚡ CREATE TABLE IF NOT EXISTS transactions → ⚡ CREATE TABLE IF NOT EXISTS monthly_balance → ◇ IF old expenses exists → ⚡ INSERT INTO transactions SELECT ... FROM expenses → ⚡ DROP expenses → ◇ IF categories empty → ⚡ INSERT 21 default categories → ⎋ return Database

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// region FUNC_createDb [DOMAIN(8): Budget; CONCEPT(9): DatabaseInit; TECH(9): better-sqlite3]
// ## @purpose To enable any caller (server startup, test fixture) to obtain a ready-to-use SQLite connection with a guaranteed schema, without worrying about directory creation or table existence. Includes automatic migration from legacy expenses table to new transactions schema.
// ## @uses better-sqlite3, fs, path
// ## @io [optional string] -> [Database]
// ## @complexity 8
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

    // === Create categories table ===
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '📦',
            workspace_id TEXT DEFAULT 'family_1',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log(`[IMP:7][createDb][SCHEMA] Categories table ensured [IO]`);

    // === Create transactions table (replaces expenses) ===
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id),
            workspace_id TEXT DEFAULT 'family_1',
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log(`[IMP:7][createDb][SCHEMA] Transactions table ensured [IO]`);

    // === Create monthly_balance table ===
    db.exec(`
        CREATE TABLE IF NOT EXISTS monthly_balance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL,
            year INTEGER NOT NULL,
            opening_balance REAL DEFAULT 0,
            closing_balance REAL DEFAULT 0,
            workspace_id TEXT DEFAULT 'family_1',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log(`[IMP:7][createDb][SCHEMA] Monthly_balance table ensured [IO]`);

    // === Migration: copy data from old expenses table if it exists ===
    const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'`).get() as { name: string } | undefined;
    if (tableCheck) {
        console.log(`[IMP:6][createDb][MIGRATE] Found legacy 'expenses' table, starting migration [FLOW]`);
        const countBefore = (db.prepare(`SELECT COUNT(*) as cnt FROM transactions`).get() as { cnt: number }).cnt;
        if (countBefore === 0) {
            db.exec(`
                INSERT INTO transactions (type, amount, description, workspace_id, date)
                SELECT 'expense', amount, description, workspace_id, date FROM expenses
            `);
            const migratedCount = (db.prepare(`SELECT COUNT(*) as cnt FROM transactions`).get() as { cnt: number }).cnt;
            console.log(`[IMP:9][createDb][MIGRATE] Migrated ${migratedCount} records from expenses to transactions [BUSINESS]`);
        } else {
            console.log(`[IMP:6][createDb][MIGRATE] Transactions already contain data, skipping migration [FLOW]`);
        }
        db.exec(`DROP TABLE expenses`);
        console.log(`[IMP:7][createDb][MIGRATE] Legacy expenses table dropped [IO]`);
    } else {
        console.log(`[IMP:5][createDb][MIGRATE] No legacy expenses table found, skipping migration [FLOW]`);
    }

    // === Seed default categories if empty ===
    const catCount = (db.prepare(`SELECT COUNT(*) as cnt FROM categories`).get() as { cnt: number }).cnt;
    if (catCount === 0) {
        console.log(`[IMP:6][createDb][SEED] Categories table empty, inserting default categories [FLOW]`);
        const defaultCategories: Array<{ name: string; icon: string }> = [
            { name: 'Продукты', icon: '🛒' },
            { name: 'Кафе и рестораны', icon: '🍽️' },
            { name: 'Транспорт', icon: '🚌' },
            { name: 'Автомобиль', icon: '🚗' },
            { name: 'Дом', icon: '🏠' },
            { name: 'Коммунальные услуги', icon: '💡' },
            { name: 'Связь и интернет', icon: '📱' },
            { name: 'Подписки', icon: '📺' },
            { name: 'Здоровье', icon: '❤️' },
            { name: 'Аптека', icon: '💊' },
            { name: 'Одежда', icon: '👕' },
            { name: 'Покупки', icon: '🛍️' },
            { name: 'Развлечения', icon: '🎬' },
            { name: 'Подарки', icon: '🎁' },
            { name: 'Путешествия', icon: '✈️' },
            { name: 'Дети', icon: '👶' },
            { name: 'Домашние животные', icon: '🐾' },
            { name: 'Образование', icon: '📚' },
            { name: 'Кредиты', icon: '💳' },
            { name: 'Налоги', icon: '📋' },
            { name: 'Прочее', icon: '📦' }
        ];
        const insertCat = db.prepare(`INSERT INTO categories (name, icon, workspace_id) VALUES (?, ?, 'family_1')`);
        const insertMany = db.transaction((categories: Array<{ name: string; icon: string }>) => {
            for (const cat of categories) {
                insertCat.run(cat.name, cat.icon);
            }
        });
        insertMany(defaultCategories);
        console.log(`[IMP:9][createDb][SEED] Inserted ${defaultCategories.length} default categories [BUSINESS]`);
    } else {
        console.log(`[IMP:5][createDb][SEED] Categories table already has ${catCount} entries, skipping seed [FLOW]`);
    }

    console.log(`[IMP:9][createDb][RESULT] Database ready at ${resolvedPath} [BUSINESS]`);
    return db;
}
// endregion FUNC_createDb
