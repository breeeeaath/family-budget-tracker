// region MODULE_CONTRACT [DOMAIN(8): FinanceTracker; CONCEPT(7): ReferenceData; TECH(9): ReactQuery]
// ## @modulecontract
// ## @purpose React Query hooks for categories: list with infinite stale time, create.
// ## @scope useCategories, useCreateCategory.
// ## @input Category creation data.
// ## @output Query/mutation results.
// ## @links [USES_API(9): categoriesAPI]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial category hooks.]
// ## @modulemap
// ## HOOK 10[List categories, staleTime Infinity] => useCategories
// ## HOOK 10[Create category, invalidates list] => useCreateCategory
function _module_contract() {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: useCategories, useCreateCategory, staleTime Infinity, category, reference data
// STRUCTURE: ▶ useCategories → queryFn(categoriesAPI.list) → staleTime Infinity → ⎋ categories[]
// STRUCTURE: ▶ useCreateCategory → mutateAsync(categoriesAPI.create) → invalidate ['categories'] → ⎋ CategoryOut

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../api/client';

// region HOOK_useCategories [DOMAIN(8): FinanceTracker; CONCEPT(7): CategoryLookup; TECH(8): ReactQuery, useQuery]
// ## @purpose Fetch all categories. Stale time is Infinity since categories rarely change.
// ## @io () -> { data, isLoading }
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesAPI.list,
    staleTime: Infinity,
  });
}
// endregion HOOK_useCategories

// region HOOK_useCreateCategory [DOMAIN(8): FinanceTracker; CONCEPT(7): CategoryManagement; TECH(8): ReactQuery, useMutation]
// ## @purpose Create a new category and invalidate the category list.
// ## @io (data: CategoryCreate) -> mutation
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => categoriesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
// endregion HOOK_useCreateCategory
