// region MODULE_CONTRACT [DOMAIN(8): FinanceTracker; CONCEPT(7): Analytics, Dashboard; TECH(9): ReactQuery]
// ## @modulecontract
// ## @purpose React Query hooks for analytics data: dashboard summary and category breakdown.
// ## @scope useDashboardSummary, useCategoryStats.
// ## @input None.
// ## @output Query results with aggregated financial data.
// ## @links [USES_API(9): analyticsAPI]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial analytics hooks.]
// ## @modulemap
// ## HOOK 10[Dashboard summary query] => useDashboardSummary
// ## HOOK 10[Category statistics query] => useCategoryStats
function _module_contract() {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: useDashboardSummary, useCategoryStats, analytics, summary, byCategory, dashboard, pie chart
// STRUCTURE: ▶ useDashboardSummary → queryFn(analyticsAPI.summary) → staleTime 60s → ⎋ {total_balance, expense_today, expense_this_month, income_this_month}
// STRUCTURE: ▶ useCategoryStats → queryFn(analyticsAPI.byCategory) → staleTime 60s → ⎋ [{category_id, category_name, total_amount, icon, color}]

import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../api/client';

// region HOOK_useDashboardSummary [DOMAIN(8): FinanceTracker; CONCEPT(7): DashboardWidgets; TECH(8): ReactQuery, useQuery]
// ## @purpose Fetch dashboard financial summary: balance, daily/monthly expenses and income.
// ## @io () -> { data, isLoading }
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: analyticsAPI.summary,
    staleTime: 60 * 1000,
  });
}
// endregion HOOK_useDashboardSummary

// region HOOK_useCategoryStats [DOMAIN(8): FinanceTracker; CONCEPT(7): PieChartData; TECH(8): ReactQuery, useQuery]
// ## @purpose Fetch category-level spending breakdown for pie chart visualization.
// ## @io () -> { data, isLoading }
export function useCategoryStats() {
  return useQuery({
    queryKey: ['category-stats'],
    queryFn: analyticsAPI.byCategory,
    staleTime: 60 * 1000,
  });
}
// endregion HOOK_useCategoryStats
