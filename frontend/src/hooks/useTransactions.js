// region MODULE_CONTRACT [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalManagement; TECH(9): ReactQuery, OptimisticUpdates]
// ## @modulecontract
// ## @purpose React Query hooks for transaction CRUD with optimistic updates.
// ## @scope useAddTransaction (optimistic), useTransactions (filtered list).
// ## @input Transaction data / filter params.
// ## @output Mutation/query results.
// ## @links [USES_API(9): transactionsAPI]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial transaction hooks with optimistic updates.]
// ## @modulemap
// ## HOOK 10[Add transaction with optimistic update + rollback] => useAddTransaction
// ## HOOK 10[List transactions with filters] => useTransactions
function _module_contract() {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: useAddTransaction, useTransactions, optimistic update, onMutate, onError rollback, onSettled invalidate
// STRUCTURE: ▶ useAddTransaction → onMutate(snapshot←cancelQueries→setQueryData(push)) → onError(rollback snapshot) → onSettled(invalidate ['transactions','dashboard-summary','category-stats'])
// STRUCTURE: ▶ useTransactions ┌params(limit,offset,type,start_date,end_date,category_id)┐ → queryFn(transactionsAPI.list) → ⎋ transactions[]

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI } from '../api/client';

// region HOOK_useAddTransaction [DOMAIN(8): FinanceTracker; CONCEPT(8): OptimisticUI; TECH(9): ReactQuery, useMutation]
// ## @purpose Add transaction with optimistic update: immediately pushes to cache, rolls back on error, invalidates related queries on settle.
// ## @io (data: TransactionCreate) -> mutation
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => transactionsAPI.create(data),

    onMutate: async (newTx) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previous = queryClient.getQueryData(['transactions']);

      queryClient.setQueryData(['transactions'], (old) => {
        if (!old) return { transactions: [newTx] };
        return {
          ...old,
          transactions: [
            { ...newTx, id: Date.now(), user_id: 0 },
            ...old.transactions,
          ],
        };
      });

      return { previous };
    },

    onError: (_err, _newTx, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['transactions'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
    },
  });
}
// endregion HOOK_useAddTransaction

// region HOOK_useTransactions [DOMAIN(8): FinanceTracker; CONCEPT(7): HistoryView; TECH(8): ReactQuery, useQuery]
// ## @purpose Fetch paginated, filtered transaction list.
// ## @io (params: { limit, offset, type, start_date, end_date, category_id }) -> { data, isLoading }
export function useTransactions(params = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionsAPI.list(params),
    staleTime: 30 * 1000,
  });
}
// endregion HOOK_useTransactions
