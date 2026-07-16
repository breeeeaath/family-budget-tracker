// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): CategoryCRUD, BusinessLogic; TECH(8): better-sqlite3, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all business logic for category CRUD operations, ensuring data integrity through workspace isolation and soft-delete semantics when transactions reference a category.
// ## @scope Category creation, retrieval, renaming, deletion with soft-delete fallback, workspace isolation.
// ## @input An open better-sqlite3 Database instance, a workspaceId string.
// ## @output CategoryService instance with methods for getAll, create, update, delete.
// ## @links [USES_API(8): better-sqlite3/Database; USES_DATA_FROM: db.ts/createDb]
// ## @invariants
// ## - getAll() ALWAYS returns an array (possibly empty) of active categories.
// ## - create() returns the full newly-inserted record.
// ## - update() modifies the name field only; returns the updated record.
// ## - delete() returns true; if transactions reference this category, performs soft-delete (is_active=0) instead of hard DELETE.
// ## @rationale
// ## Q: Why soft-delete instead of hard-delete when transactions exist?
// ## A: Preserves referential integrity — historical transactions keep their category reference. Hard-delete is only safe when no transactions reference the category.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of CategoryService with LDD logging and soft-delete logic]
// ## @modulemap
// ## CLASS 9[Category CRUD business logic with soft-delete] => CategoryService
// ##   METHOD 8[Get all active categories for workspace] => getAll
// ##   METHOD 9[Create new category and return full record] => create
// ##   METHOD 7[Rename an existing category] => update
// ##   METHOD 9[Hard-delete or soft-delete category] => delete
// ## @usecases
// ## - [CategoryService.getAll]: UI (Dropdown) -> getAll -> Populate category selector
// ## - [CategoryService.create]: UI (AddForm) -> create(name, icon) -> Insert + Return record
// ## - [CategoryService.delete]: UI (DeleteButton) -> delete(id) -> Soft/hard delete
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: category, CRUD, soft-delete, CategoryService, getAll, create, update, delete, workspace isolation, LDD
// STRUCTURE: ▶ CategoryService ┌db, workspaceId┐ → ◇ getAll: SELECT WHERE is_active=1 ORDER BY id → ◇ create: ┌INSERT┐ → ⊕ SELECT new record → ◇ update: ┌UPDATE name WHERE id┐ → ⊕ SELECT updated → ◇ delete: ◇ ┌transactions exist?┐ ─Yes→ UPDATE is_active=0 ─No→ DELETE → ⎋ boolean

import Database from 'better-sqlite3';

// region TYPES [DOMAIN(8): Budget; CONCEPT(7): DataModel; TECH(6): TypeScript]
// ## @purpose To define the shape of a category record as stored in and returned from the database.
export interface Category {
    id: number;
    name: string;
    icon: string;
    workspace_id: string;
    is_active: number;
    created_at: string;
}
// endregion TYPES

// region CLASS_CategoryService [DOMAIN(8): Budget, FamilyFinance; CONCEPT(9): CRUD, WorkspaceIsolation; TECH(8): TypeScript, better-sqlite3]
// ## @purpose To provide a clean, testable API for all category-related database operations, enforcing workspace isolation and soft-delete semantics.
export class CategoryService {
    private db: Database.Database;
    private workspaceId: string;

    constructor(db: Database.Database, workspaceId: string = 'family_1') {
        this.db = db;
        this.workspaceId = workspaceId;
        console.log(`[IMP:6][CategoryService][INIT] Workspace: ${workspaceId} [FLOW]`);
    }

    // region METHOD_getAll [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): SQL]
    // ## @purpose To retrieve all active categories for the current workspace, providing the UI with a complete category list sorted by id.
    // ## @uses this.db
    // ## @io [] -> [Category[]]
    // ## @complexity 4
    getAll(): Category[] {
        console.log(`[IMP:5][CategoryService][getAll] Fetching active categories for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM categories
                WHERE workspace_id = ? AND is_active = 1
                ORDER BY id ASC
            `);
            const categories = stmt.all(this.workspaceId) as Category[];
            console.log(`[IMP:7][CategoryService][getAll] Retrieved ${categories.length} categories [IO]`);
            return categories;
        } catch (error) {
            console.error(`[IMP:10][CategoryService][getAll] CRITICAL: Failed to fetch categories. workspace=${this.workspaceId} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getAll

    // region METHOD_create [DOMAIN(8): Budget; CONCEPT(8): Create; TECH(7): SQL]
    // ## @purpose To insert a new category into the database with the given name and optional icon, returning the fully-populated record to confirm successful creation.
    // ## @uses this.db
    // ## @io [string, optional string] -> [Category]
    // ## @complexity 6
    create(name: string, icon?: string): Category {
        console.log(`[IMP:5][CategoryService][create] Attempting create: name='${name}', icon='${icon ?? '📦'}' [FLOW]`);

        // === Business Validation (IMP:9) ===
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            const errMsg = `Validation failed: name must be non-empty string, got '${name}'`;
            console.error(`[IMP:9][CategoryService][create] ${errMsg} [BUSINESS]`);
            throw new Error(errMsg);
        }

        const resolvedIcon = icon && icon.trim().length > 0 ? icon.trim() : '📦';

        console.log(`[IMP:9][CategoryService][create] Validation passed for name='${name}' [BUSINESS]`);

        // === Database Insert (IMP:7) ===
        try {
            const insertStmt = this.db.prepare(`
                INSERT INTO categories (name, icon, workspace_id)
                VALUES (?, ?, ?)
            `);
            const info = insertStmt.run(name.trim(), resolvedIcon, this.workspaceId);
            console.log(`[IMP:7][CategoryService][create] INSERT executed, lastInsertRowid=${info.lastInsertRowid} [IO]`);

            // Retrieve the newly created record
            const selectStmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
            const newCategory = selectStmt.get(info.lastInsertRowid) as Category;
            console.log(`[IMP:7][CategoryService][create] Created category id=${newCategory.id}, name='${newCategory.name}' [IO]`);

            console.log(`[IMP:9][CategoryService][create] Category created successfully: id=${newCategory.id}, name='${newCategory.name}' [BUSINESS]`);
            return newCategory;
        } catch (error) {
            console.error(`[IMP:10][CategoryService][create] CRITICAL: Insert failed. name='${name}', icon='${resolvedIcon}' [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_create

    // region METHOD_update [DOMAIN(8): Budget; CONCEPT(7): Update; TECH(6): SQL]
    // ## @purpose To rename an existing category by id, scoped to the current workspace, returning the updated record.
    // ## @uses this.db
    // ## @io [number, string] -> [Category]
    // ## @complexity 5
    update(id: number, name: string): Category {
        console.log(`[IMP:5][CategoryService][update] Attempting update: id=${id}, name='${name}' [FLOW]`);

        // === Business Validation (IMP:9) ===
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            const errMsg = `Validation failed: name must be non-empty string, got '${name}'`;
            console.error(`[IMP:9][CategoryService][update] ${errMsg} [BUSINESS]`);
            throw new Error(errMsg);
        }

        console.log(`[IMP:9][CategoryService][update] Validation passed for id=${id}, name='${name}' [BUSINESS]`);

        // === Database Update (IMP:7) ===
        try {
            const updateStmt = this.db.prepare(`
                UPDATE categories SET name = ? WHERE id = ? AND workspace_id = ?
            `);
            const info = updateStmt.run(name.trim(), id, this.workspaceId);

            if (info.changes === 0) {
                const errMsg = `Category id=${id} not found or not in workspace`;
                console.error(`[IMP:9][CategoryService][update] ${errMsg} [BUSINESS]`);
                throw new Error(errMsg);
            }

            console.log(`[IMP:7][CategoryService][update] UPDATE executed, changes=${info.changes} [IO]`);

            // Retrieve the updated record
            const selectStmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
            const updatedCategory = selectStmt.get(id) as Category;
            console.log(`[IMP:7][CategoryService][update] Updated category id=${updatedCategory.id} [IO]`);

            console.log(`[IMP:9][CategoryService][update] Category updated successfully: id=${updatedCategory.id}, name='${updatedCategory.name}' [BUSINESS]`);
            return updatedCategory;
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Category id=')) {
                throw error;
            }
            console.error(`[IMP:10][CategoryService][update] CRITICAL: Update failed. id=${id}, name='${name}' [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_update

    // region METHOD_delete [DOMAIN(8): Budget; CONCEPT(9): Delete, SoftDelete; TECH(7): SQL]
    // ## @purpose To remove a category by its id, scoped to the current workspace. If no transactions reference this category, performs a hard DELETE. If transactions exist, performs a soft-delete by setting is_active=0. Returns true if any action was taken.
    // ## @uses this.db
    // ## @io [number] -> [boolean]
    // ## @complexity 8
    delete(id: number): boolean {
        console.log(`[IMP:5][CategoryService][delete] Attempting delete: id=${id} [FLOW]`);
        try {
            // Check if any transactions reference this category
            const checkStmt = this.db.prepare(`
                SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ?
            `);
            const { cnt } = checkStmt.get(id) as { cnt: number };
            console.log(`[IMP:7][CategoryService][delete] Transactions referencing category id=${id}: ${cnt} [IO]`);

            if (cnt > 0) {
                // Soft delete: set is_active = 0
                const softDeleteStmt = this.db.prepare(`
                    UPDATE categories SET is_active = 0 WHERE id = ? AND workspace_id = ?
                `);
                const result = softDeleteStmt.run(id, this.workspaceId);
                const deleted = result.changes > 0;
                if (deleted) {
                    console.log(`[IMP:9][CategoryService][delete] Category id=${id} soft-deleted (${cnt} transactions reference it) [BUSINESS]`);
                } else {
                    console.log(`[IMP:9][CategoryService][delete] Category id=${id} not found or not in workspace [BUSINESS]`);
                }
                return deleted;
            } else {
                // Hard delete: no transactions reference this category
                const hardDeleteStmt = this.db.prepare(`
                    DELETE FROM categories WHERE id = ? AND workspace_id = ?
                `);
                const result = hardDeleteStmt.run(id, this.workspaceId);
                const deleted = result.changes > 0;
                if (deleted) {
                    console.log(`[IMP:9][CategoryService][delete] Category id=${id} hard-deleted [BUSINESS]`);
                } else {
                    console.log(`[IMP:9][CategoryService][delete] Category id=${id} not found or not in workspace [BUSINESS]`);
                }
                return deleted;
            }
        } catch (error) {
            console.error(`[IMP:10][CategoryService][delete] CRITICAL: Delete failed. id=${id} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_delete
}
// endregion CLASS_CategoryService
