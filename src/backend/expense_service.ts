// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking, FamilyFinance; CONCEPT(9): CRUD, BusinessValidation; TECH(9): better-sqlite3, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all business logic for transaction (income/expense) CRUD operations, ensuring data integrity through validation, workspace isolation, and JOIN-based category enrichment before any database interaction.
// ## @scope Transaction creation with type and category support, retrieval with category JOIN, deletion with workspace scope, net balance calculation.
// ## @input An open better-sqlite3 Database instance, a workspaceId string.
// ## @output ExpenseService instance with methods for getAll, create, delete, getBalance, getTotal.
// ## @links [USES_API(9): better-sqlite3/Database; USES_DATA_FROM: db.ts/createDb; USES_TABLE: categories]
// ## @invariants
// ## - getAll() ALWAYS returns an array (possibly empty) with category_name and category_icon from JOIN.
// ## - create() throws an error if amount <= 0, description is empty, or type is invalid.
// ## - delete() returns true only if a row was actually deleted.
// ## - getBalance() ALWAYS returns a number (could be negative if expenses exceed income).
// ## - getTotal() ALWAYS returns a number >= 0.
// ## @rationale
// ## Q: Why rename ExpenseService to keep the old name when it now handles both income and expense?
// ## A: Backward compatibility — existing imports and tests reference ExpenseService. The internal logic uses the `type` discriminator.
// ## Q: Why JOIN categories in getAll instead of a separate query?
// ## A: Saves N+1 queries; 50 transactions x 1 category query each would be 50 extra round-trips.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Extended interface: type, category_id, category_name, category_icon. New getBalance(). getAll() now JOINs categories. create() accepts type and category_id.]
// ## @modulemap
// ## CLASS 10[Transaction CRUD business logic with validation and category enrichment] => ExpenseService
// ##   METHOD 9[Get latest 50 transactions with category info] => getAll
// ##   METHOD 10[Validate and create transaction (income/expense)] => create
// ##   METHOD 8[Delete transaction by id with workspace check] => delete
// ##   METHOD 7[Calculate net balance (income - expense)] => getBalance
// ##   METHOD 7[Calculate total sum of expenses] => getTotal
// ## @usecases
// ## - [ExpenseService.getAll]: UI (List) -> getAll -> Display 50 latest transactions with categories
// ## - [ExpenseService.create]: UI (Form) -> create(type, amount, desc, category_id?) -> Insert + Return created record
// ## - [ExpenseService.delete]: UI (DeleteButton) -> delete(id) -> Remove + Confirm
// ## - [ExpenseService.getBalance]: UI (BalanceCard) -> getBalance -> Display net balance
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: transaction, expense, income, CRUD, validation, business logic, ExpenseService, getAll, create, delete, getBalance, getTotal, category JOIN, LDD
// STRUCTURE: ▶ ExpenseService ┌db, workspaceId┐ → ◇ getAll: SELECT + LEFT JOIN categories → ◇ create: ┌type◇ check? `income`|`expense`┐ → ┌validation◇┐ → ⊕ INSERT INTO transactions → ◇ delete: DELETE FROM transactions ┌+workspaceId┐ → ◇ getBalance: SELECT SUM(CASE type=income THEN amount ELSE -amount) → ◇ getTotal: SELECT SUM WHERE type='expense' → ⎋ result

import Database from 'better-sqlite3';

// region TYPES [DOMAIN(9): Budget; CONCEPT(8): DataModel; TECH(6): TypeScript]
// ## @purpose To define the shape of a transaction record as stored in and returned from the database, including optional JOIN data from the categories table.
export interface Expense {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category_id: number | null;
    category_name: string | null;
    category_icon: string | null;
    workspace_id: string;
    date: string;
}
// endregion TYPES

// region CLASS_ExpenseService [DOMAIN(9): Budget, FamilyFinance; CONCEPT(9): CRUD, Validation; TECH(8): TypeScript, better-sqlite3]
// ## @purpose To provide a clean, testable API for all transaction-related database operations, enforcing business rules (valid type, non-negative amounts, non-empty descriptions) and workspace isolation.
export class ExpenseService {
    private db: Database.Database;
    private workspaceId: string;

    constructor(db: Database.Database, workspaceId: string = 'family_1') {
        this.db = db;
        this.workspaceId = workspaceId;
        console.log(`[IMP:6][ExpenseService][INIT] Workspace: ${workspaceId} [FLOW]`);
    }

    // region METHOD_getAll [DOMAIN(9): Budget; CONCEPT(8): Read; TECH(7): SQL]
    // ## @purpose To retrieve the 50 most recent transaction records for the current workspace, enriched with category name and icon via LEFT JOIN, providing the UI with a complete view of the transaction history.
    // ## @uses this.db, categories table
    // ## @io [] -> [Expense[]]
    // ## @complexity 6
    getAll(): Expense[] {
        console.log(`[IMP:5][ExpenseService][getAll] Fetching last 50 transactions for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare(`
                SELECT
                    t.id,
                    t.type,
                    t.amount,
                    t.description,
                    t.category_id,
                    c.name AS category_name,
                    c.icon AS category_icon,
                    t.workspace_id,
                    t.date
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.workspace_id = ?
                ORDER BY t.id DESC
                LIMIT 50
            `);
            const transactions = stmt.all(this.workspaceId) as Expense[];
            console.log(`[IMP:7][ExpenseService][getAll] Retrieved ${transactions.length} transactions [IO]`);
            return transactions;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][getAll] CRITICAL: Failed to fetch transactions. workspace=${this.workspaceId} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getAll

    // region METHOD_create [DOMAIN(9): Budget; CONCEPT(10): Validation, Insert; TECH(8): SQL]
    // ## @purpose To validate user input and persist a new transaction (income or expense) record, returning the fully-populated record to confirm successful creation.
    // ## @uses this.db
    // ## @io [string, number, string, optional number] -> [Expense]
    // ## @complexity 8
    create(type: string, amount: number, description: string, category_id?: number | null): Expense {
        console.log(`[IMP:5][ExpenseService][create] Attempting create: type=${type}, amount=${amount}, description='${description}', category_id=${category_id} [FLOW]`);

        // === Business Validation (IMP:9) ===
        if (!type || (type !== 'income' && type !== 'expense')) {
            const errMsg = `Validation failed: type must be 'income' or 'expense', got '${type}'`;
            console.error(`[IMP:9][ExpenseService][create] ${errMsg} [BUSINESS]`);
            throw new Error(errMsg);
        }
        if (amount == null || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            const errMsg = `Validation failed: amount must be positive number, got ${amount}`;
            console.error(`[IMP:9][ExpenseService][create] ${errMsg} [BUSINESS]`);
            throw new Error(errMsg);
        }
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            const errMsg = `Validation failed: description must be non-empty string, got '${description}'`;
            console.error(`[IMP:9][ExpenseService][create] ${errMsg} [BUSINESS]`);
            throw new Error(errMsg);
        }

        console.log(`[IMP:9][ExpenseService][create] Validation passed for type=${type}, amount=${amount}, description='${description}' [BUSINESS]`);

        // === Database Insert (IMP:7) ===
        try {
            const resolvedCategoryId = category_id != null && !isNaN(category_id) ? category_id : null;
            const insertStmt = this.db.prepare(`
                INSERT INTO transactions (type, amount, description, category_id, workspace_id)
                VALUES (?, ?, ?, ?, ?)
            `);
            const info = insertStmt.run(type, amount, description.trim(), resolvedCategoryId, this.workspaceId);
            console.log(`[IMP:7][ExpenseService][create] INSERT executed, lastInsertRowid=${info.lastInsertRowid} [IO]`);

            // Retrieve the newly created record with category JOIN
            const selectStmt = this.db.prepare(`
                SELECT
                    t.id,
                    t.type,
                    t.amount,
                    t.description,
                    t.category_id,
                    c.name AS category_name,
                    c.icon AS category_icon,
                    t.workspace_id,
                    t.date
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.id = ?
            `);
            const newTransaction = selectStmt.get(info.lastInsertRowid) as Expense;
            console.log(`[IMP:7][ExpenseService][create] Created transaction id=${newTransaction.id} [IO]`);

            console.log(`[IMP:9][ExpenseService][create] Transaction created successfully: id=${newTransaction.id}, type=${newTransaction.type}, amount=${newTransaction.amount} [BUSINESS]`);
            return newTransaction;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][create] CRITICAL: Insert failed. type=${type}, amount=${amount}, description='${description}' [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_create

    // region METHOD_delete [DOMAIN(9): Budget; CONCEPT(8): Delete; TECH(7): SQL]
    // ## @purpose To remove a transaction by its id, scoped to the current workspace, and indicate whether a record was actually deleted.
    // ## @uses this.db
    // ## @io [number] -> [boolean]
    // ## @complexity 5
    delete(id: number): boolean {
        console.log(`[IMP:5][ExpenseService][delete] Attempting delete: id=${id} [FLOW]`);
        try {
            const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ? AND workspace_id = ?');
            const result = stmt.run(id, this.workspaceId);
            const deleted = result.changes > 0;
            console.log(`[IMP:7][ExpenseService][delete] DELETE id=${id}, changes=${result.changes}, deleted=${deleted} [IO]`);

            if (deleted) {
                console.log(`[IMP:9][ExpenseService][delete] Transaction id=${id} deleted successfully [BUSINESS]`);
            } else {
                console.log(`[IMP:9][ExpenseService][delete] Transaction id=${id} not found or not in workspace [BUSINESS]`);
            }
            return deleted;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][delete] CRITICAL: Delete failed. id=${id} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_delete

    // region METHOD_getBalance [DOMAIN(9): Budget; CONCEPT(9): Aggregation, Balance; TECH(7): SQL]
    // ## @purpose To compute the net balance (sum of incomes minus sum of expenses) for the current workspace, providing a quick financial snapshot without transferring all records.
    // ## @uses this.db
    // ## @io [] -> [number]
    // ## @complexity 5
    getBalance(): number {
        console.log(`[IMP:5][ExpenseService][getBalance] Calculating net balance for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare(`
                SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN CAST(amount AS REAL) ELSE -CAST(amount AS REAL) END), 0) as balance
                FROM transactions
                WHERE workspace_id = ?
            `);
            const row = stmt.get(this.workspaceId) as { balance: number };
            console.log(`[IMP:7][ExpenseService][getBalance] Net balance = ${row.balance} [IO]`);
            console.log(`[IMP:9][ExpenseService][getBalance] Balance computed: ${row.balance} [BUSINESS]`);
            return row.balance;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][getBalance] CRITICAL: Balance calculation failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getBalance

    // region METHOD_getTotal [DOMAIN(9): Budget; CONCEPT(7): Aggregation; TECH(6): SQL]
    // ## @purpose To compute the total sum of all expense-type transactions in the current workspace, providing a quick spend overview without transferring all records.
    // ## @uses this.db
    // ## @io [] -> [number]
    // ## @complexity 4
    getTotal(): number {
        console.log(`[IMP:5][ExpenseService][getTotal] Calculating total expenses for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare(`
                SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
                FROM transactions
                WHERE workspace_id = ? AND type = 'expense'
            `);
            const row = stmt.get(this.workspaceId) as { total: number };
            console.log(`[IMP:7][ExpenseService][getTotal] Total expenses = ${row.total} [IO]`);
            return row.total;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][getTotal] CRITICAL: Total calculation failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getTotal
}
// endregion CLASS_ExpenseService
