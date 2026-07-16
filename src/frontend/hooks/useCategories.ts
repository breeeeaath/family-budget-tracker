// region MODULE_CONTRACT [DOMAIN(8): Budget, Categories; CONCEPT(9): ReactHook, StateManagement; TECH(8): React19, TypeScript]
// ## @modulecontract
// ## @purpose Category CRUD using localStorage only. No fetch, no environment detection.
// ## @scope Category list display, create/update/delete operations, error feedback.
// ## @input None.
// ## @output { categories, isLoading, error, createCategory, updateCategory, deleteCategory }
// ## @links [USES: storage.ts]
// ## @changes
// ## LAST_CHANGE: [v2.2.0 – Removed fetch. Always localStorage. Added error state.]
// ## @modulemap
// ## FUNC 8[React hook: categories via localStorage only] => useCategories
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: React, hook, useCategories, localStorage, categories, CRUD, error feedback
// STRUCTURE: ▶ useCategories() → ⚡ storage.ts functions → ┌useState: categories, isLoading, error┐ → CRUD → refresh → updateState → ⎋

import { useState, useEffect, useCallback } from 'react';
import {
    getAllCategories,
    createCategory as createCat,
    updateCategory as updateCat,
    deleteCategory as deleteCat,
    type Category
} from '../storage.js';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(() => {
        setError(null);
        try {
            const cats = getAllCategories();
            setCategories(cats);
            console.log(`[IMP:7][useCategories][fetchCategories] Loaded ${cats.length} categories [IO]`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[IMP:10][useCategories][fetchCategories] Error: ${msg} [FATAL]`);
            setError(msg);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const createCategory = useCallback(async (name: string, icon?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            createCat(name, icon);
            fetchCategories();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);

    const updateCategory = useCallback(async (id: number, name: string) => {
        setIsLoading(true);
        setError(null);
        try {
            updateCat(id, name);
            fetchCategories();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);

    const deleteCategory = useCallback(async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            deleteCat(id);
            fetchCategories();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories]);

    return {
        categories,
        isLoading,
        error,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
}
// endregion
