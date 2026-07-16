// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking, FamilyFinance; CONCEPT(9): CRUD, BusinessValidation; TECH(9): better-sqlite3, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all business logic for expense CRUD operations, ensuring data integrity through validation and workspace isolation before any database interaction.
// ## @scope Expense creation with validation, retrieval, deletion with workspace scope, total calculation.
// ## @input An open better-sqlite3 Database instance, a workspaceId string.
// ## @output ExpenseService instance with methods for getAll, create, delete, getTotal.
// ## @links [USES_API(9): better-sqlite3/Database; USES_DATA_FROM: db.ts/createDb]
// ## @invariants
// ## - getAll() ALWAYS returns an array (possibly empty).
// ## - create() throws an error if amount <= 0 or description is empty.
// ## - delete() returns true only if a row was actually deleted.
// ## - getTotal() ALWAYS returns a number >= 0.
// ## @rationale
// ## Q: Why a class instead of plain functions?
// ## A: A class naturally binds the db instance and workspaceId, avoiding repeated parameter passing. Dependency injection via constructor enables test isolation with :memory: databases.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of ExpenseService with LDD logging]
// ## @modulemap
// ## CLASS 10[Expense CRUD business logic with validation] => ExpenseService
// ##   METHOD 9[Get latest 50 expenses] => getAll
// ##   METHOD 10[Validate and create expense] => create
// ##   METHOD 8[Delete expense by id with workspace check] => delete
// ##   METHOD 7[Calculate total sum of expenses] => getTotal
// ## @usecases
// ## - [ExpenseService.getAll]: UI (List) → getAll → Display 50 latest expenses
// ## - [ExpenseService.create]: UI (Form) → create(amount, desc) → Insert + Return created record
// ## - [ExpenseService.delete]: UI (DeleteButton) → delete(id) → Remove + Confirm
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: expense, CRUD, validation, business logic, ExpenseService, getAll, create, delete, getTotal, LDD
// STRUCTURE: ▶ ExpenseService ┌db, workspaceId┐ → ◇ getAll: SELECT LIMIT 50 → ◇ create: ┌validation◇┐ → ⊕ INSERT → ◇ delete: DELETE ┌+workspaceId┐ → ◇ getTotal: SELECT SUM → ⎋ result

import Database from 'better-sqlite3';

// region TYPES [DOMAIN(9): Budget; CONCEPT(8): DataModel; TECH(6): TypeScript]
// ## @purpose To define the shape of an expense record as stored in and returned from the database, ensuring type safety across all service boundaries.
export interface Expense {
    id: number;
    amount: number;
    description: string;
    workspace_id: string;
    date: string;
}
// endregion TYPES

// region CLASS_ExpenseService [DOMAIN(9): Budget, FamilyFinance; CONCEPT(9): CRUD, Validation; TECH(8): TypeScript, better-sqlite3]
// ## @purpose To provide a clean, testable API for all expense-related database operations, enforcing business rules (non-negative amounts, non-empty descriptions) and workspace isolation.
export class ExpenseService {
    private db: Database.Database;
    private workspaceId: string;

    constructor(db: Database.Database, workspaceId: string = 'family_1') {
        this.db = db;
        this.workspaceId = workspaceId;
        console.log(`[IMP:6][ExpenseService][INIT] Workspace: ${workspaceId} [FLOW]`);
    }

    // region METHOD_getAll [DOMAIN(9): Budget; CONCEPT(8): Read; TECH(7): SQL]
    // ## @purpose To retrieve the 50 most recent expense records for the current workspace, providing the UI with a paginated view of the latest transactions.
    // ## @uses this.db
    // ## @io [] -> [Expense[]]
    // ## @complexity 5
    getAll(): Expense[] {
        console.log(`[IMP:5][ExpenseService][getAll] Fetching last 50 expenses for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM expenses
                WHERE workspace_id = ?
                ORDER BY id DESC
                LIMIT 50
            `);
            const expenses = stmt.all(this.workspaceId) as Expense[];
            console.log(`[IMP:7][ExpenseService][getAll] Retrieved ${expenses.length} expenses [IO]`);
            return expenses;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][getAll] CRITICAL: Failed to fetch expenses. workspace=${this.workspaceId} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getAll

    // region METHOD_create [DOMAIN(9): Budget; CONCEPT(10): Validation, Insert; TECH(8): SQL]
    // ## @purpose To validate user input and persist a new expense record, returning the fully-populated record to confirm successful creation.
    // ## @uses this.db
    // ## @io [number, string] -> [Expense]
    // ## @complexity 8
    create(amount: number, description: string): Expense {
        console.log(`[IMP:5][ExpenseService][create] Attempting create: amount=${amount}, description='${description}' [FLOW]`);

        // === Business Validation (IMP:9) ===
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

        console.log(`[IMP:9][ExpenseService][create] Validation passed for amount=${amount}, description='${description}' [BUSINESS]`);

        // === Database Insert (IMP:7) ===
        try {
            const insertStmt = this.db.prepare(`
                INSERT INTO expenses (amount, description, workspace_id)
                VALUES (?, ?, ?)
            `);
            const info = insertStmt.run(amount, description.trim(), this.workspaceId);
            console.log(`[IMP:7][ExpenseService][create] INSERT executed, lastInsertRowid=${info.lastInsertRowid} [IO]`);

            // Retrieve the newly created record
            const selectStmt = this.db.prepare('SELECT * FROM expenses WHERE id = ?');
            const newExpense = selectStmt.get(info.lastInsertRowid) as Expense;
            console.log(`[IMP:7][ExpenseService][create] Created expense id=${newExpense.id} [IO]`);

            console.log(`[IMP:9][ExpenseService][create] Expense created successfully: id=${newExpense.id}, amount=${newExpense.amount} [BUSINESS]`);
            return newExpense;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][create] CRITICAL: Insert failed. amount=${amount}, description='${description}' [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_create

    // region METHOD_delete [DOMAIN(9): Budget; CONCEPT(8): Delete; TECH(7): SQL]
    // ## @purpose To remove an expense by its id, scoped to the current workspace, and indicate whether a record was actually deleted.
    // ## @uses this.db
    // ## @io [number] -> [boolean]
    // ## @complexity 5
    delete(id: number): boolean {
        console.log(`[IMP:5][ExpenseService][delete] Attempting delete: id=${id} [FLOW]`);
        try {
            const stmt = this.db.prepare('DELETE FROM expenses WHERE id = ? AND workspace_id = ?');
            const result = stmt.run(id, this.workspaceId);
            const deleted = result.changes > 0;
            console.log(`[IMP:7][ExpenseService][delete] DELETE id=${id}, changes=${result.changes}, deleted=${deleted} [IO]`);

            if (deleted) {
                console.log(`[IMP:9][ExpenseService][delete] Expense id=${id} deleted successfully [BUSINESS]`);
            } else {
                console.log(`[IMP:9][ExpenseService][delete] Expense id=${id} not found or not in workspace [BUSINESS]`);
            }
            return deleted;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][delete] CRITICAL: Delete failed. id=${id} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_delete

    // region METHOD_getTotal [DOMAIN(9): Budget; CONCEPT(7): Aggregation; TECH(6): SQL]
    // ## @purpose To compute the total sum of all expenses in the current workspace, providing a quick financial overview without transferring all records.
    // ## @uses this.db
    // ## @io [] -> [number]
    // ## @complexity 4
    getTotal(): number {
        console.log(`[IMP:5][ExpenseService][getTotal] Calculating total for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare('SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM expenses WHERE workspace_id = ?');
            const row = stmt.get(this.workspaceId) as { total: number };
            console.log(`[IMP:7][ExpenseService][getTotal] Total = ${row.total} [IO]`);
            return row.total;
        } catch (error) {
            console.error(`[IMP:10][ExpenseService][getTotal] CRITICAL: Total calculation failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getTotal
}
// endregion CLASS_ExpenseService
