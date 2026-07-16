// region MODULE_CONTRACT [DOMAIN(9): Budget, ExpenseTracking; CONCEPT(9): ReactHook, StateManagement; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To provide a unified interface for transaction CRUD, balance, and stats — using localStorage in production (Vercel) and fetch API in development. Auto-detects environment.
// ## @scope Transaction CRUD, balance, stats, loading state management.
// ## @input None.
// ## @output { transactions, balance, stats, isLoading, addTransaction, deleteTransaction, fetchAll }
// ## @links [USES: storage.ts (production); CALLS_API: /api/transactions (development)]
// ## @invariants
// ## - transactions ALWAYS returns an array.
// ## - In production (Vercel), uses localStorage — no network, instant updates.
// ## - In development, uses Express backend via fetch.
// ## @rationale
// ## Q: Why switch storage based on environment?
// ## A: Vercel serverless doesn't support SQLite/better-sqlite3. localStorage provides full CRUD + persistence without a backend.
// ## @changes
// ## LAST_CHANGE: [v2.1.0 – Added localStorage fallback for Vercel production]
// ## @modulemap
// ## FUNC 10[React hook: transactions + balance + stats via localStorage or fetch] => useExpenses
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useExpenses, localStorage, transactions, balance, stats, CRUD, Vercel
// STRUCTURE: ▶ useExpenses() → ◇ PROD? ┌storage.ts functions┐ || DEV? ┌fetch to /api/*┐ → ┌useState: transactions, balance, stats, isLoading┐ → addTransaction/deleteTransaction → refresh all → ⎋ {transactions, balance, stats, isLoading, addTransaction, deleteTransaction}

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

// BUG_FIX_CONTEXT: Checking import.meta.env.PROD was unreliable in minified Vercel builds.
// Instead, detect Vercel deployment by hostname — this is a runtime check that always works.
const IS_PROD: boolean = typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app');

// region FUNC_useExpenses [DOMAIN(9): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
// ## @purpose Unified hook: localStorage in production, fetch API in development.
// ## @uses storage.ts (production), fetch (development)
// ## @io [] -> [object]
// ## @complexity 8
export function useExpenses() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [stats, setStats] = useState<Stats>({ today: 0, yesterday: 0, this_week: 0, this_month: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const prod = IS_PROD;

    // region BLOCK_refreshData [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(6): Storage|Fetch]
    const refreshData = useCallback(() => {
        if (prod) {
            console.log(`[IMP:5][useExpenses][refreshData] Refreshing from localStorage [FLOW]`);
            try {
                const txs = getAllTransactions();
                const bal = calcBalance();
                const sts = calcStats();
                setTransactions(txs);
                setBalance(bal);
                setStats(sts);
                console.log(`[IMP:7][useExpenses][refreshData] Loaded: ${txs.length} tx, balance=${bal} [IO]`);
            } catch (error) {
                console.error(`[IMP:10][useExpenses][refreshData] localStorage error [FATAL]`, error);
            }
        } else {
            console.log(`[IMP:5][useExpenses][refreshData] Refreshing from API [FLOW]`);
            Promise.all([
                fetch('/api/transactions').then(r => r.ok ? r.json() : Promise.reject(r.status)),
                fetch('/api/balance').then(r => r.ok ? r.json() : Promise.reject(r.status)),
                fetch('/api/stats').then(r => r.ok ? r.json() : Promise.reject(r.status))
            ]).then(([txs, bal, sts]) => {
                setTransactions(txs);
                setBalance(bal.balance || 0);
                setStats(sts);
                console.log(`[IMP:7][useExpenses][refreshData] API: ${txs.length} tx, balance=${bal.balance} [IO]`);
            }).catch(error => {
                console.error(`[IMP:10][useExpenses][refreshData] API error, falling back to localStorage [FATAL]`, error);
                // Fallback to localStorage on API failure
                try {
                    const txs = getAllTransactions();
                    const bal = calcBalance();
                    const sts = calcStats();
                    setTransactions(txs);
                    setBalance(bal);
                    setStats(sts);
                } catch (e2) {
                    // ignore
                }
            });
        }
    }, [prod]);
    // endregion BLOCK_refreshData

    // region BLOCK_useEffect [DOMAIN(7): React; CONCEPT(7): Lifecycle; TECH(7): useEffect]
    useEffect(() => {
        refreshData();
    }, [refreshData]);
    // endregion BLOCK_useEffect

    // region BLOCK_addTransaction [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): Storage|Fetch]
    const addTransaction = useCallback(async (
        type: 'income' | 'expense',
        amount: number,
        description: string,
        category_id?: number | null
    ) => {
        console.log(`[IMP:5][useExpenses][addTransaction] Adding ${type}: amount=${amount} [FLOW]`);
        setIsLoading(true);
        try {
            if (prod) {
                createTx(type, amount, description, category_id);
            } else {
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
            }
            refreshData();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][addTransaction] Failed [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [prod, refreshData]);
    // endregion BLOCK_addTransaction

    // region BLOCK_deleteTransaction [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Storage|Fetch]
    const deleteTransaction = useCallback(async (id: number) => {
        console.log(`[IMP:5][useExpenses][deleteTransaction] Deleting id=${id} [FLOW]`);
        try {
            if (prod) {
                deleteTx(id);
            } else {
                const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                console.log(`[IMP:7][useExpenses][deleteTransaction] DELETE successful id=${id} [IO]`);
            }
            refreshData();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][deleteTransaction] Failed [FATAL]`, error);
        }
    }, [prod, refreshData]);
    // endregion BLOCK_deleteTransaction

    console.log(`[IMP:6][useExpenses][STATE] ${prod ? 'PRODUCTION(localStorage)' : 'DEV(API)'}: tx=${transactions.length}, balance=${balance} [FLOW]`);

    return {
        transactions,
        balance,
        stats,
        isLoading,
        addTransaction,
        deleteTransaction,
        fetchAll: refreshData
    };
}
// endregion FUNC_useExpenses
