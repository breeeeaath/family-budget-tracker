// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): ReactHook, StateManagement, Fetch; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all HTTP communication with the transaction/balance/stats API in a single reusable React hook, providing a clean interface for CRUD operations, balance display, and period statistics.
// ## @scope State management for transactions, balance, stats, and loading indicator. API fetch calls for GET/POST/DELETE /api/transactions, GET /api/balance, GET /api/stats.
// ## @input None (uses relative /api/ endpoints).
// ## @output Object with transactions[], balance, stats, isLoading, and CRUD callbacks.
// ## @links [USES_API(8): fetch/browser; CALLS_API: expense_controller_ts /api/transactions, /api/balance, /api/stats]
// ## @invariants
// ## - transactions ALWAYS returns an array.
// ## - balance is a number, default 0.
// ## - stats is an object {today, yesterday, this_week, this_month}, all default 0.
// ## - After any mutation, transactions, balance, and stats are re-fetched.
// ## @rationale
// ## Q: Why fetch balance and stats together with transactions?
// ## A: All three are derived from the same data source. Fetching them together ensures UI consistency — balance always matches the displayed transaction list.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Added type, category_id, category_name, balance, stats. Endpoints changed to /api/transactions.]
// ## @modulemap
// ## FUNC 10[React hook for transaction CRUD + balance + stats] => useExpenses
// ## @usecases
// ## - [useExpenses]: App.tsx → useExpenses() → { transactions, balance, stats, isLoading, addTransaction, deleteTransaction }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useExpenses, fetch, transactions, balance, stats, CRUD, income, expense, useState, useEffect, browser API
// STRUCTURE: ▶ useExpenses() → ┌useState transactions, balance, stats┐ → ○ fetchData: ┌GET /transactions┐ ⊕ ┌GET /balance┐ ⊕ ┌GET /stats┐ → ◇ addTransaction: POST /api/transactions (type, amount, desc, category_id) → re-fetchAll → ◇ deleteTransaction: DELETE /:id → re-fetchAll → ⎋ {transactions, balance, stats, isLoading, addTransaction, deleteTransaction}

import { useState, useEffect, useCallback } from 'react';

// region TYPES [DOMAIN(9): Budget; CONCEPT(8): DataModel; TECH(6): TypeScript]
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

export interface Stats {
    today: number;
    yesterday: number;
    this_week: number;
    this_month: number;
}
// endregion TYPES

// region FUNC_useExpenses [DOMAIN(9): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
// ## @purpose To provide UI components with a unified interface for transaction data, current balance, and period statistics without direct HTTP knowledge.
// ## @uses React useState, useEffect, useCallback; browser fetch API
// ## @io [] -> [object]
// ## @complexity 8
export function useExpenses() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [stats, setStats] = useState<Stats>({ today: 0, yesterday: 0, this_week: 0, this_month: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // region BLOCK_fetchTransactions [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): fetch]
    // ## @purpose Fetch transactions list from server.
    const fetchTransactions = useCallback(async () => {
        console.log(`[IMP:5][useExpenses][fetchTransactions] Fetching transactions [FLOW]`);
        try {
            const res = await fetch('/api/transactions');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: Transaction[] = await res.json();
            setTransactions(data);
            console.log(`[IMP:7][useExpenses][fetchTransactions] Received ${data.length} transactions [IO]`);
        } catch (error) {
            console.error(`[IMP:10][useExpenses][fetchTransactions] CRITICAL: Failed to fetch transactions [FATAL]`, error);
        }
    }, []);
    // endregion BLOCK_fetchTransactions

    // region BLOCK_fetchBalance [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): fetch]
    // ## @purpose Fetch current balance from server.
    const fetchBalance = useCallback(async () => {
        console.log(`[IMP:5][useExpenses][fetchBalance] Fetching balance [FLOW]`);
        try {
            const res = await fetch('/api/balance');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setBalance(data.balance || 0);
            console.log(`[IMP:7][useExpenses][fetchBalance] Balance: ${data.balance} [IO]`);
        } catch (error) {
            console.error(`[IMP:10][useExpenses][fetchBalance] CRITICAL: Failed to fetch balance [FATAL]`, error);
        }
    }, []);
    // endregion BLOCK_fetchBalance

    // region BLOCK_fetchStats [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): fetch]
    // ## @purpose Fetch period statistics from server.
    const fetchStats = useCallback(async () => {
        console.log(`[IMP:5][useExpenses][fetchStats] Fetching stats [FLOW]`);
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: Stats = await res.json();
            setStats(data);
            console.log(`[IMP:7][useExpenses][fetchStats] Stats: today=${data.today}, month=${data.this_month} [IO]`);
        } catch (error) {
            console.error(`[IMP:10][useExpenses][fetchStats] CRITICAL: Failed to fetch stats [FATAL]`, error);
        }
    }, []);
    // endregion BLOCK_fetchStats

    // region BLOCK_fetchAll [DOMAIN(7): Budget; CONCEPT(7): Aggregation; TECH(7): fetch]
    // ## @purpose Fetch all data (transactions, balance, stats) in parallel.
    const fetchAll = useCallback(async () => {
        await Promise.all([fetchTransactions(), fetchBalance(), fetchStats()]);
    }, [fetchTransactions, fetchBalance, fetchStats]);
    // endregion BLOCK_fetchAll

    // region BLOCK_useEffect [DOMAIN(7): React; CONCEPT(7): Lifecycle; TECH(7): useEffect]
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);
    // endregion BLOCK_useEffect

    // region BLOCK_addTransaction [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): fetch]
    // ## @purpose Send new transaction to server, manage loading state, refresh all data.
    const addTransaction = useCallback(async (
        type: 'income' | 'expense',
        amount: number,
        description: string,
        category_id?: number | null
    ) => {
        console.log(`[IMP:5][useExpenses][addTransaction] Adding ${type}: amount=${amount}, description='${description}' [FLOW]`);
        setIsLoading(true);
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, amount, description, category_id: category_id || null })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useExpenses][addTransaction] POST successful [IO]`);
            await fetchAll();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][addTransaction] CRITICAL: Failed to add transaction [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAll]);
    // endregion BLOCK_addTransaction

    // region BLOCK_deleteTransaction [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): fetch]
    // ## @purpose Remove transaction by id and refresh all data.
    const deleteTransaction = useCallback(async (id: number) => {
        console.log(`[IMP:5][useExpenses][deleteTransaction] Deleting transaction id=${id} [FLOW]`);
        try {
            const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log(`[IMP:7][useExpenses][deleteTransaction] DELETE successful id=${id} [IO]`);
            await fetchAll();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][deleteTransaction] CRITICAL: Failed to delete transaction ${id} [FATAL]`, error);
        }
    }, [fetchAll]);
    // endregion BLOCK_deleteTransaction

    console.log(`[IMP:6][useExpenses][STATE] transactions=${transactions.length}, balance=${balance}, isLoading=${isLoading} [FLOW]`);

    return {
        transactions,
        balance,
        stats,
        isLoading,
        addTransaction,
        deleteTransaction,
        fetchAll
    };
}
// endregion FUNC_useExpenses
