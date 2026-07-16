// region MODULE_CONTRACT [DOMAIN(8): Budget, Categories; CONCEPT(9): ReactHook, StateManagement; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose To provide category CRUD — localStorage in production (Vercel), fetch API in development.
// ## @scope Category list display, create/update/delete operations.
// ## @input None.
// ## @output { categories, isLoading, createCategory, updateCategory, deleteCategory }
// ## @links [USES: storage.ts (production); CALLS_API: /api/categories (development)]
// ## @invariants
// ## - categories ALWAYS returns an array.
// ## - In production, uses localStorage.
// ## @changes
// ## LAST_CHANGE: [v2.1.0 – Added localStorage fallback for Vercel production]
// ## @modulemap
// ## FUNC 8[React hook: categories via localStorage or fetch] => useCategories
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useCategories, localStorage, categories, CRUD, Vercel
// STRUCTURE: ▶ useCategories() → ◇ PROD? ┌storage.ts functions┐ || DEV? ┌fetch to /api/categories┐ → ┌useState: categories, isLoading┐ → CRUD operations → refresh → ⎋ {categories, isLoading, createCategory, updateCategory, deleteCategory}

import { useState, useEffect, useCallback } from 'react';
import {
    getAllCategories,
    createCategory as createCat,
    updateCategory as updateCat,
    deleteCategory as deleteCat,
    type Category
} from '../storage.js';

// BUG_FIX_CONTEXT: Hostname-based detection is more reliable than import.meta.env in minified builds.
const IS_PROD: boolean = typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app');

// region FUNC_useCategories [DOMAIN(8): Budget; CONCEPT(9): CustomHook; TECH(8): React19]
export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const prod = IS_PROD;

    const fetchCategories = useCallback(async () => {
        console.log(`[IMP:5][useCategories][fetchCategories] Fetching categories [FLOW]`);
        try {
            if (prod) {
                const cats = getAllCategories();
                setCategories(cats);
                console.log(`[IMP:7][useCategories][fetchCategories] localStorage: ${cats.length} categories [IO]`);
            } else {
                const res = await fetch('/api/categories');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: Category[] = await res.json();
                setCategories(data);
                console.log(`[IMP:7][useCategories][fetchCategories] API: ${data.length} categories [IO]`);
            }
        } catch (error) {
            console.error(`[IMP:10][useCategories][fetchCategories] Failed [FATAL]`, error);
            // Fallback to localStorage on API failure
            try {
                const cats = getAllCategories();
                setCategories(cats);
            } catch (e2) {
                // ignore
            }
        }
    }, [prod]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const createCategory = useCallback(async (name: string, icon?: string) => {
        setIsLoading(true);
        try {
            if (prod) {
                createCat(name, icon);
            } else {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, icon: icon || '📦' })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
            }
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][createCategory] Failed [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [prod, fetchCategories]);

    const updateCategory = useCallback(async (id: number, name: string) => {
        setIsLoading(true);
        try {
            if (prod) {
                updateCat(id, name);
            } else {
                const res = await fetch(`/api/categories/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
            }
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][updateCategory] Failed [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [prod, fetchCategories]);

    const deleteCategory = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            if (prod) {
                deleteCat(id);
            } else {
                const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
            }
            await fetchCategories();
        } catch (error) {
            console.error(`[IMP:10][useCategories][deleteCategory] Failed [FATAL]`, error);
        } finally {
            setIsLoading(false);
        }
    }, [prod, fetchCategories]);

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
