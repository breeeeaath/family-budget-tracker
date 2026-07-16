// region MODULE_CONTRACT [DOMAIN(8): Budget, ExpenseTracking; CONCEPT(9): ReactHook, StateManagement, Fetch; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all HTTP communication with the expense API in a single reusable React hook, removing fetch-logic from UI components and providing a clean interface for CRUD operations.
// ## @scope State management for expenses list and loading indicator, API fetch calls for GET/POST/DELETE.
// ## @input None (uses relative /api/expenses endpoint).
// ## @output An object with expenses array, isLoading boolean, and fetchExpenses/addExpense/deleteExpense callbacks.
// ## @links [USES_API(8): fetch/browser; CALLS_API: expense_controller_ts /api/expenses]
// ## @invariants
// ## - expenses ALWAYS returns an array (empty array on initial render).
// ## - isLoading starts as false, becomes true during addExpense, resets to false after.
// ## - After addExpense and deleteExpense, fetchExpenses is called automatically to refresh the list.
// ## @rationale
// ## Q: Why a custom hook instead of inline fetch in App.tsx?
// ## A: Separation of concerns — the hook manages data fetching and state, the component manages rendering. This also enables future caching, error boundaries, and testing of fetch logic independently.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of useExpenses hook]
// ## @modulemap
// ## FUNC 9[React hook for expense CRUD with fetch] => useExpenses
// ## @usecases
// ## - [useExpenses]: App.tsx → useExpenses() → { expenses, isLoading, fetchExpenses, addExpense, deleteExpense }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useExpenses, fetch, expenses, CRUD, useState, useEffect, browser API
// STRUCTURE: ▶ useExpenses() → ┌useState expenses┐ + ┌useState isLoading┐ → ○ fetchExpenses: GET /api/expenses → setExpenses → ◇ addExpense: POST (amount,desc) → setIsLoading T → RE-fetch → setIsLoading F → ◇ deleteExpense: DELETE /:id → re-fetch → ⎋ {expenses, isLoading, fetchExpenses, addExpense, deleteExpense}

import { useState, useEffect, useCallback } from 'react';

// region TYPES [DOMAIN(8): Budget; CONCEPT(7): DataModel; TECH(6): TypeScript]
export interface Expense {
    id: number;
    amount: number;
    description: string;
    workspace_id: string;
    date: string;
}
// endregion TYPES

// region FUNC_useExpenses [DOMAIN(8): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
// ## @purpose To provide UI components with a simple, consistent interface for displaying and manipulating expense data without any direct knowledge of HTTP or API structure.
// ## @uses React useState, useEffect, useCallback; browser fetch API
// ## @io [] -> [object]
// ## @complexity 7
export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // region BLOCK_fetchExpenses [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): fetch]
    // ## @purpose To retrieve the latest expense list from the server and update local state.
    const fetchExpenses = useCallback(async () => {
        console.log(`[IMP:5][useExpenses][fetchExpenses] Fetching expenses [FLOW]`);
        try {
            const res = await fetch('/api/expenses');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data: Expense[] = await res.json();
            setExpenses(data);
            console.log(`[IMP:7][useExpenses][fetchExpenses] Received ${data.length} expenses [IO]`);
        } catch (error) {
            console.error(`[IMP:10][useExpenses][fetchExpenses] CRITICAL: Failed to fetch expenses [FATAL]`, error);
        }
    }, []);
    // endregion BLOCK_fetchExpenses

    // region BLOCK_useEffect [DOMAIN(7): React; CONCEPT(7): Lifecycle; TECH(7): useEffect]
    // ## @purpose To trigger initial data load when the component mounts.
    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);
    // endregion BLOCK_useEffect

    // region BLOCK_addExpense [DOMAIN(9): Budget; CONCEPT(9): Create; TECH(7): fetch]
    // ## @purpose To send a new expense to the server, manage loading state, and refresh the list upon completion.
    const addExpense = useCallback(async (amount: number, description: string) => {
        console.log(`[IMP:5][useExpenses][addExpense] Adding expense: amount=${amount}, description='${description}' [FLOW]`);
        setIsLoading(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useExpenses][addExpense] POST successful [IO]`);
            await fetchExpenses();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][addExpense] CRITICAL: Failed to add expense [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchExpenses]);
    // endregion BLOCK_addExpense

    // region BLOCK_deleteExpense [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): fetch]
    // ## @purpose To remove an expense by id and refresh the display list.
    const deleteExpense = useCallback(async (id: number) => {
        console.log(`[IMP:5][useExpenses][deleteExpense] Deleting expense id=${id} [FLOW]`);
        try {
            const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useExpenses][deleteExpense] DELETE successful id=${id} [IO]`);
            await fetchExpenses();
        } catch (error) {
            console.error(`[IMP:10][useExpenses][deleteExpense] CRITICAL: Failed to delete expense ${id} [FATAL]`, error);
        }
    }, [fetchExpenses]);
    // endregion BLOCK_deleteExpense

    console.log(`[IMP:6][useExpenses][STATE] Current expenses count: ${expenses.length}, isLoading: ${isLoading} [FLOW]`);

    return {
        expenses,
        isLoading,
        fetchExpenses,
        addExpense,
        deleteExpense
    };
}
// endregion FUNC_useExpenses
