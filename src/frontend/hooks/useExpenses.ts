// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): ReactHook, StateManagement; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To provide transaction CRUD, balance, and stats — uses localStorage exclusively. No fetch, no environment detection, no backend dependency. Instant, offline-capable.
// ## @scope Transaction CRUD, balance, stats, error display, loading state.
// ## @input None.
// ## @output { transactions, balance, stats, isLoading, error, addTransaction, deleteTransaction, fetchAll }
// ## @links [USES: storage.ts]
// ## @invariants
// ## - transactions ALWAYS returns an array.
// ## - All operations are synchronous — no network calls.
// ## - If localStorage fails, error state is set and displayed to user.
// ## @rationale
// ## Q: Why remove fetch entirely?
// ## A: Environment detection was fragile on Vercel builds. localStorage works everywhere, instantly, and persists across sessions. The Express backend remains for local dev via `npm run dev`.
// ## @changes
// ## LAST_CHANGE: [v2.2.0 – Removed all environment detection and fetch logic. Always localStorage. Added error state for user feedback.]
// ## @modulemap
// ## FUNC 10[React hook: transactions + balance + stats via localStorage only] => useExpenses
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useExpenses, localStorage, transactions, balance, stats, CRUD, error feedback
// STRUCTURE: ▶ useExpenses() → ⚡ storage.ts functions → ┌useState: transactions, balance, stats, isLoading, error┐ → addTransaction/deleteTransaction → refresh → updateState → ◇ error? → show to user → ⎋ {transactions, balance, stats, isLoading, error, addTransaction, deleteTransaction}

import { useState, useEffect, useCallback } from 'react';
import {
    getAllTransactions,
    createTransaction as createTx,
    deleteTransaction as deleteTx,
    getBalance as calcBalance,
    getStats as calcStats,
    type Transaction,
    type Stats
} from '../storage.js';

// region FUNC_useExpenses [DOMAIN(9): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
// ## @purpose Simple localStorage-only hook with visible error feedback.
// ## @uses storage.ts
// ## @io [] -> [object]
// ## @complexity 6
export function useExpenses() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [stats, setStats] = useState<Stats>({ today: 0, yesterday: 0, this_week: 0, this_month: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // BUG_FIX_CONTEXT: Users had no feedback when errors occurred. Added error state visible in UI.
    const [error, setError] = useState<string | null>(null);

    // region BLOCK_refreshData [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): Storage]
    const refreshData = useCallback(() => {
        setError(null);
        try {
            const txs = getAllTransactions();
            const bal = calcBalance();
            const sts = calcStats();
            setTransactions(txs);
            setBalance(bal);
            setStats(sts);
            console.log(`[IMP:7][useExpenses][refreshData] Loaded: ${txs.length} tx, balance=${bal} [IO]`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[IMP:10][useExpenses][refreshData] Error: ${msg} [FATAL]`);
            setError(`Ошибка загрузки данных: ${msg}`);
        }
    }, []);
    // endregion BLOCK_refreshData

    // region BLOCK_useEffect [DOMAIN(7): React; CONCEPT(7): Lifecycle; TECH(7): useEffect]
    useEffect(() => {
        refreshData();
    }, [refreshData]);
    // endregion BLOCK_useEffect

    // region BLOCK_addTransaction [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): Storage]
    const addTransaction = useCallback(async (
        type: 'income' | 'expense',
        amount: number,
        description: string,
        category_id?: number | null
    ) => {
        console.log(`[IMP:5][useExpenses][addTransaction] Adding ${type}: amount=${amount} desc='${description}' [FLOW]`);
        setIsLoading(true);
        setError(null);
        try {
            createTx(type, amount, description, category_id);
            refreshData();
            console.log(`[IMP:9][useExpenses][addTransaction] Transaction created successfully [BUSINESS]`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[IMP:10][useExpenses][addTransaction] Failed: ${msg} [FATAL]`);
            setError(`Не удалось добавить: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    }, [refreshData]);
    // endregion BLOCK_addTransaction

    // region BLOCK_deleteTransaction [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Storage]
    const deleteTransaction = useCallback(async (id: number) => {
        console.log(`[IMP:5][useExpenses][deleteTransaction] Deleting id=${id} [FLOW]`);
        setError(null);
        try {
            const deleted = deleteTx(id);
            if (deleted) {
                refreshData();
                console.log(`[IMP:9][useExpenses][deleteTransaction] Deleted id=${id} [BUSINESS]`);
            } else {
                console.log(`[IMP:7][useExpenses][deleteTransaction] Transaction id=${id} not found [IO]`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[IMP:10][useExpenses][deleteTransaction] Failed: ${msg} [FATAL]`);
            setError(`Не удалось удалить: ${msg}`);
        }
    }, [refreshData]);
    // endregion BLOCK_deleteTransaction

    // region BLOCK_clearError [DOMAIN(6): UI; CONCEPT(5): Feedback; TECH(4): React]
    const clearError = useCallback(() => setError(null), []);
    // endregion BLOCK_clearError

    return {
        transactions,
        balance,
        stats,
        isLoading,
        error,
        clearError,
        addTransaction,
        deleteTransaction,
        fetchAll: refreshData
    };
}
// endregion FUNC_useExpenses
