// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): ClientStorage, Persistence; TECH(8): TypeScript, localStorage]
// ## @modulecontract
// ## @purpose To provide a client-side storage layer using browser localStorage as a fallback for serverless deployments (Vercel) where SQLite is unavailable. Mirrors the ExpenseService + CategoryService + StatsService API.
// ## @scope CRUD for transactions and categories, balance calculation, period statistics, monthly rollover — all in-memory with localStorage persistence.
// ## @input None (reads/writes localStorage under key 'family_budget_data').
// ## @output Synchronous API mirroring the backend service interfaces.
// ## @links []
// ## @invariants
// ## - Data is ALWAYS loaded from localStorage on init, saved on every mutation.
// ## - All IDs are auto-incremented integers starting from 1.
// ## - Categories are seeded with 21 defaults if no data exists.
// ## - Balance = sum(incomes) - sum(expenses).
// ## @rationale
// ## Q: Why localStorage instead of IndexedDB?
// ## A: Simpler API, synchronous reads, sufficient for budget-size data (< 5MB). IndexedDB adds unnecessary complexity for this use case.
// ## @changes
// ## LAST_CHANGE: [v2.1.0 – Initial creation of client-side storage for Vercel compatibility]
// ## @modulemap
// ## FUNC 9[Load/save persisted budget state] => loadState, saveState
// ## FUNC 9[Get all transactions] => getAllTransactions
// ## FUNC 9[Create transaction] => createTransaction
// ## FUNC 8[Delete transaction] => deleteTransaction
// ## FUNC 8[Calculate balance] => getBalance
// ## FUNC 8[Get period statistics] => getStats
// ## FUNC 7[Get all categories] => getAllCategories
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: localStorage, client storage, offline, transactions, categories, balance, stats, CRUD, Vercel, serverless
// STRUCTURE: ▶ loadState() → ┌JSON.parse(localStorage) || defaultState┐ → ⊕ saveState() on every mutation → ○ getAllTransactions: filter+sort → ○ createTransaction: push+save → ○ deleteTransaction: splice+save → ○ getBalance: reduce incomes - expenses → ○ getStats: filter by date periods → ○ categories CRUD → ⎋

// region TYPES [DOMAIN(8): Budget; CONCEPT(7): DataModel; TECH(6): TypeScript]
export interface Transaction {
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

export interface Category {
    id: number;
    name: string;
    icon: string;
    workspace_id: string;
    is_active: number;
}

export interface Stats {
    today: number;
    yesterday: number;
    this_week: number;
    this_month: number;
}

interface BudgetState {
    nextId: number;
    nextCatId: number;
    transactions: Transaction[];
    categories: Category[];
}

const STORAGE_KEY = 'family_budget_data';
// endregion TYPES

// region HELPER_defaultCategories [DOMAIN(7): Budget; CONCEPT(7): SeedData; TECH(5): Constants]
const DEFAULT_CATEGORIES: Array<{ name: string; icon: string }> = [
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
// endregion HELPER_defaultCategories

// region FUNC_loadState [DOMAIN(8): Budget; CONCEPT(9): Persistence; TECH(6): localStorage]
// ## @purpose Load budget state from localStorage, or initialize with defaults (empty transactions + 21 default categories).
// ## @io [] -> [BudgetState]
// ## @complexity 4
function loadState(): BudgetState {
    console.log(`[IMP:5][storage][loadState] Loading state from localStorage [FLOW]`);
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const state: BudgetState = JSON.parse(raw);
            console.log(`[IMP:7][storage][loadState] Loaded: ${state.transactions.length} transactions, ${state.categories.length} categories [IO]`);
            return state;
        }
    } catch (error) {
        console.error(`[IMP:10][storage][loadState] Failed to parse localStorage, reinitializing [FATAL]`, error);
    }

    // Initialize default state
    const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
        id: idx + 1,
        name: cat.name,
        icon: cat.icon,
        workspace_id: 'family_1',
        is_active: 1
    }));
    const defaultState: BudgetState = {
        nextId: 1,
        nextCatId: defaultCategories.length + 1,
        transactions: [],
        categories: defaultCategories
    };
    console.log(`[IMP:9][storage][loadState] Initialized default state with ${defaultCategories.length} categories [BUSINESS]`);
    saveState(defaultState);
    return defaultState;
}
// endregion FUNC_loadState

// region FUNC_saveState [DOMAIN(8): Budget; CONCEPT(9): Persistence; TECH(6): localStorage]
// ## @purpose Persist budget state to localStorage.
// ## @io [BudgetState] -> [void]
// ## @complexity 3
function saveState(state: BudgetState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log(`[IMP:6][storage][saveState] Saved: ${state.transactions.length} transactions [FLOW]`);
    } catch (error) {
        console.error(`[IMP:10][storage][saveState] Failed to save to localStorage [FATAL]`, error);
    }
}
// endregion FUNC_saveState

// === Module-level state (loaded once, persisted on every mutation) ===
let _state: BudgetState | null = null;

function getState(): BudgetState {
    if (!_state) {
        _state = loadState();
    }
    return _state;
}

// region FUNC_getAllTransactions [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): Array]
// ## @purpose Return all transactions sorted by id DESC (most recent first), enriched with category name/icon.
// ## @io [] -> [Transaction[]]
// ## @complexity 5
export function getAllTransactions(): Transaction[] {
    const state = getState();
    const catMap = new Map(state.categories.map(c => [c.id, c]));
    const result = [...state.transactions]
        .map(tx => {
            const cat = tx.category_id ? catMap.get(tx.category_id) : null;
            return {
                ...tx,
                category_name: cat?.name || null,
                category_icon: cat?.icon || null
            };
        })
        .sort((a, b) => b.id - a.id)
        .slice(0, 50);
    console.log(`[IMP:6][storage][getAllTransactions] Returning ${result.length} transactions [FLOW]`);
    return result;
}
// endregion FUNC_getAllTransactions

// region FUNC_createTransaction [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): Array]
// ## @purpose Create a new transaction, persist immediately, return the full record.
// ## @io [type, amount, description, category_id?] -> [Transaction]
// ## @complexity 5
export function createTransaction(
    type: 'income' | 'expense',
    amount: number,
    description: string,
    category_id?: number | null
): Transaction {
    if (type !== 'income' && type !== 'expense') {
        throw new Error(`Validation failed: type must be 'income' or 'expense', got '${type}'`);
    }
    if (amount == null || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw new Error('Validation failed: amount must be a positive number');
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        throw new Error('Validation failed: description must be a non-empty string');
    }

    const state = getState();
    const id = state.nextId++;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cat = category_id ? state.categories.find(c => c.id === category_id) : null;

    const tx: Transaction = {
        id,
        type,
        amount,
        description: description.trim(),
        category_id: category_id || null,
        category_name: cat?.name || null,
        category_icon: cat?.icon || null,
        workspace_id: 'family_1',
        date: now
    };
    state.transactions.push(tx);
    saveState(state);
    console.log(`[IMP:9][storage][createTransaction] Created transaction id=${id}: type=${type}, amount=${amount}, description='${description}' [BUSINESS]`);
    // BUG_FIX_CONTEXT: Return enriched transaction so UI can display category immediately.
    return tx;
}
// endregion FUNC_createTransaction

// region FUNC_deleteTransaction [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(6): Array]
// ## @purpose Delete a transaction by id, persist, return success.
// ## @io [number] -> [boolean]
// ## @complexity 4
export function deleteTransaction(id: number): boolean {
    const state = getState();
    const idx = state.transactions.findIndex(tx => tx.id === id);
    if (idx === -1) {
        console.log(`[IMP:6][storage][deleteTransaction] Transaction id=${id} not found [FLOW]`);
        return false;
    }
    state.transactions.splice(idx, 1);
    saveState(state);
    console.log(`[IMP:9][storage][deleteTransaction] Deleted transaction id=${id} [BUSINESS]`);
    return true;
}
// endregion FUNC_deleteTransaction

// region FUNC_getBalance [DOMAIN(9): Budget; CONCEPT(9): Aggregation; TECH(6): Array]
// ## @purpose Calculate current balance: sum of incomes minus sum of expenses.
// ## @io [] -> [number]
// ## @complexity 4
export function getBalance(): number {
    const state = getState();
    const balance = state.transactions.reduce((sum, tx) => {
        return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
    }, 0);
    console.log(`[IMP:7][storage][getBalance] Balance: ${balance} [IO]`);
    return balance;
}
// endregion FUNC_getBalance

// region FUNC_getStats [DOMAIN(9): Budget; CONCEPT(9): Statistics; TECH(7): Date]
// ## @purpose Calculate expense totals for today, yesterday, current week, and current month.
// ## @io [] -> [Stats]
// ## @complexity 6
export function getStats(): Stats {
    const state = getState();
    const now = new Date();

    // Start of today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of yesterday
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const yesterdayEnd = todayStart;

    // Start of current week (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    const weekStart = new Date(todayStart.getTime() - mondayOffset * 86400000);

    // Start of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = state.transactions.filter(tx => tx.type === 'expense');

    const today = expenses
        .filter(tx => new Date(tx.date) >= todayStart)
        .reduce((s, tx) => s + tx.amount, 0);

    const yesterday = expenses
        .filter(tx => {
            const d = new Date(tx.date);
            return d >= yesterdayStart && d < yesterdayEnd;
        })
        .reduce((s, tx) => s + tx.amount, 0);

    const thisWeek = expenses
        .filter(tx => new Date(tx.date) >= weekStart)
        .reduce((s, tx) => s + tx.amount, 0);

    const thisMonth = expenses
        .filter(tx => new Date(tx.date) >= monthStart)
        .reduce((s, tx) => s + tx.amount, 0);

    const stats: Stats = { today, yesterday, this_week: thisWeek, this_month: thisMonth };
    console.log(`[IMP:7][storage][getStats] Stats: today=${today}, yesterday=${yesterday}, week=${thisWeek}, month=${thisMonth} [IO]`);
    return stats;
}
// endregion FUNC_getStats

// region FUNC_getAllCategories [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): Array]
// ## @purpose Return all active categories.
// ## @io [] -> [Category[]]
// ## @complexity 3
export function getAllCategories(): Category[] {
    const state = getState();
    const active = state.categories.filter(c => c.is_active === 1);
    console.log(`[IMP:6][storage][getAllCategories] Returning ${active.length} active categories [FLOW]`);
    return active;
}
// endregion FUNC_getAllCategories

// region FUNC_createCategory [DOMAIN(8): Budget; CONCEPT(8): Create; TECH(6): Array]
// ## @purpose Create a new category and persist.
// ## @io [name, icon?] -> [Category]
// ## @complexity 4
export function createCategory(name: string, icon: string = '📦'): Category {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Validation failed: category name must be non-empty');
    }
    const state = getState();
    const cat: Category = {
        id: state.nextCatId++,
        name: name.trim(),
        icon,
        workspace_id: 'family_1',
        is_active: 1
    };
    state.categories.push(cat);
    saveState(state);
    console.log(`[IMP:9][storage][createCategory] Created category id=${cat.id}: name='${cat.name}' [BUSINESS]`);
    return cat;
}
// endregion FUNC_createCategory

// region FUNC_updateCategory [DOMAIN(8): Budget; CONCEPT(8): Update; TECH(6): Array]
// ## @purpose Rename an existing category.
// ## @io [id, name] -> [Category]
// ## @complexity 4
export function updateCategory(id: number, name: string): Category {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Validation failed: category name must be non-empty');
    }
    const state = getState();
    const cat = state.categories.find(c => c.id === id);
    if (!cat) {
        throw new Error(`Category id=${id} not found`);
    }
    cat.name = name.trim();
    saveState(state);
    console.log(`[IMP:9][storage][updateCategory] Updated category id=${id}: name='${cat.name}' [BUSINESS]`);
    return cat;
}
// endregion FUNC_updateCategory

// region FUNC_deleteCategory [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(6): Array]
// ## @purpose Delete category (hard if no transactions, soft if transactions exist).
// ## @io [number] -> [boolean]
// ## @complexity 5
export function deleteCategory(id: number): boolean {
    const state = getState();
    const cat = state.categories.find(c => c.id === id);
    if (!cat) {
        console.log(`[IMP:6][storage][deleteCategory] Category id=${id} not found [FLOW]`);
        return false;
    }
    const hasTransactions = state.transactions.some(tx => tx.category_id === id);
    if (hasTransactions) {
        cat.is_active = 0;
        console.log(`[IMP:9][storage][deleteCategory] Soft-deleted category id=${id}: name='${cat.name}' (has transactions) [BUSINESS]`);
    } else {
        const idx = state.categories.findIndex(c => c.id === id);
        state.categories.splice(idx, 1);
        console.log(`[IMP:9][storage][deleteCategory] Hard-deleted category id=${id}: name='${cat.name}' [BUSINESS]`);
    }
    saveState(state);
    return true;
}
// endregion FUNC_deleteCategory
