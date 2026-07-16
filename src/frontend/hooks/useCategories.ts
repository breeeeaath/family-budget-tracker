// region MODULE_CONTRACT [DOMAIN(8): Budget, Categories; CONCEPT(9): ReactHook, StateManagement, Fetch; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all HTTP communication with the categories API in a reusable React hook, providing CRUD operations for category management in the UI.
// ## @scope State management for categories array and loading indicator, API fetch calls for GET/POST/PUT/DELETE.
// ## @input None (uses relative /api/categories endpoint).
// ## @output An object with categories array, isLoading boolean, and CRUD callbacks.
// ## @links [USES_API(8): fetch/browser; CALLS_API: category_controller_ts /api/categories]
// ## @invariants
// ## - categories ALWAYS returns an array (empty array on initial render).
// ## - After any mutation (create/update/delete), the categories list is re-fetched automatically.
// ## @rationale
// ## Q: Why a separate hook for categories instead of merging into useExpenses?
// ## A: Single Responsibility — categories are an independent domain entity. Separate hook allows independent testing, lazy loading, and avoids bloating the transaction hook.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of useCategories hook for category CRUD]
// ## @modulemap
// ## FUNC 9[React hook for category CRUD with fetch] => useCategories
// ## @usecases
// ## - [useCategories]: App.tsx → useCategories() → { categories, isLoading, createCategory, updateCategory, deleteCategory }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useCategories, fetch, categories, CRUD, useState, useEffect, browser API
// STRUCTURE: ▶ useCategories() → ┌useState categories┐ + ┌useState isLoading┐ → ○ fetchCategories: GET /api/categories → setCategories → ◇ createCategory: POST (name,icon) → re-fetch → ◇ updateCategory: PUT /:id (name) → re-fetch → ◇ deleteCategory: DELETE /:id → re-fetch → ⎋ {categories, isLoading, createCategory, updateCategory, deleteCategory}

import { useState, useEffect, useCallback } from 'react';

// region TYPES [DOMAIN(8): Budget; CONCEPT(7): DataModel; TECH(6): TypeScript]
export interface Category {
    id: number;
    name: string;
    icon: string;
    workspace_id: string;
    is_active: number;
}
// endregion TYPES

// region FUNC_useCategories [DOMAIN(8): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
// ## @purpose To provide UI components with a simple interface for category management without direct knowledge of HTTP or API structure.
// ## @uses React useState, useEffect, useCallback; browser fetch API
// ## @io [] -> [object]
// ## @complexity 6
export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // region BLOCK_fetchCategories [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): fetch]
    // ## @purpose To retrieve the latest category list from the server and update local state.
    const fetchCategories = useCallback(async () => {
        console.log(`[IMP:5][useCategories][fetchCategories] Fetching categories [FLOW]`);
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data: Category[] = await res.json();
            setCategories(data);
            console.log(`[IMP:7][useCategories][fetchCategories] Received ${data.length} categories [IO]`);
        } catch (error) {
            console.error(`[IMP:10][useCategories][fetchCategories] CRITICAL: Failed to fetch categories [FATAL]`, error);
        }
    }, []);
    // endregion BLOCK_fetchCategories

    // region BLOCK_useEffect [DOMAIN(7): React; CONCEPT(7): Lifecycle; TECH(7): useEffect]
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);
    // endregion BLOCK_useEffect

    // region BLOCK_createCategory [DOMAIN(8): Budget; CONCEPT(9): Create; TECH(7): fetch]
    // ## @purpose To create a new category and refresh the list.
    const createCategory = useCallback(async (name: string, icon?: string) => {
        console.log(`[IMP:5][useCategories][createCategory] Creating category: name='${name}' [FLOW]`);
        setIsLoading(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, icon: icon || '📦' })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useCategories][createCategory] POST successful [IO]`);
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][createCategory] CRITICAL: Failed to create category [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);
    // endregion BLOCK_createCategory

    // region BLOCK_updateCategory [DOMAIN(8): Budget; CONCEPT(8): Update; TECH(7): fetch]
    // ## @purpose To rename an existing category and refresh the list.
    const updateCategory = useCallback(async (id: number, name: string) => {
        console.log(`[IMP:5][useCategories][updateCategory] Updating category id=${id}, name='${name}' [FLOW]`);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useCategories][updateCategory] PUT successful [IO]`);
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][updateCategory] CRITICAL: Failed to update category [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);
    // endregion BLOCK_updateCategory

    // region BLOCK_deleteCategory [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): fetch]
    // ## @purpose To delete a category and refresh the list.
    const deleteCategory = useCallback(async (id: number) => {
        console.log(`[IMP:5][useCategories][deleteCategory] Deleting category id=${id} [FLOW]`);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            console.log(`[IMP:7][useCategories][deleteCategory] DELETE successful id=${id} [IO]`);
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][deleteCategory] CRITICAL: Failed to delete category [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);
    // endregion BLOCK_deleteCategory

    console.log(`[IMP:6][useCategories][STATE] Current categories count: ${categories.length}, isLoading: ${isLoading} [FLOW]`);

    return {
        categories,
        isLoading,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
}
// endregion FUNC_useCategories
