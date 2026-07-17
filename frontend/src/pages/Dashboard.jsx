// region PAGE_Dashboard [DOMAIN(8): FinanceTracker; CONCEPT(7): DashboardView, PieChart; TECH(9): React, Recharts]
// ## @purpose Main dashboard: BalanceCard + PieChart of expenses by category for current month.
// ## @uses useDashboardSummary, useCategoryStats, BalanceCard, PieChart
// ## @complexity 6
// GREP_SUMMARY: Dashboard, BalanceCard, PieChart, Recharts, expense by category, analytics
// STRUCTURE: ▶ Page → useDashboardSummary + useCategoryStats → ◇ BalanceCard(summary) → ◇ PieChart(category-stats, filter EXPENSE only) → FAB(+) button

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BalanceCard from '../components/BalanceCard';
import { useDashboardSummary } from '../hooks/useAnalytics';
import { useCategoryStats } from '../hooks/useAnalytics';

function formatAmount(val) {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toFixed(0);
}

function renderLegendText(value, entry) {
  const pct = entry?.payload?.percent ? ` (${(entry.payload.percent * 100).toFixed(0)}%)` : '';
  return `${value}${pct}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: stats, isLoading: statsLoading } = useCategoryStats();

  const expenseData = (stats || [])
    .filter((s) => {
      return Number(s.total_amount) < 0;
    })
    .map((s) => ({
      name: s.category_name,
      value: Math.abs(Number(s.total_amount)),
      color: s.color,
      icon: s.icon,
    }));

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-page__title">Главная</h1>

      <BalanceCard data={summary} isLoading={summaryLoading} />

      <div className="dashboard-chart-section">
        <h2 className="dashboard-chart-section__title">Расходы по категориям</h2>

        {statsLoading ? (
          <div className="dashboard-chart-loading">Загрузка...</div>
        ) : expenseData.length === 0 ? (
          <div className="dashboard-chart-empty">Нет данных о расходах</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {expenseData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${formatAmount(value)} руб.`}
              />
              <Legend formatter={renderLegendText} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <button
        className="fab"
        onClick={() => navigate('/add')}
        title="Добавить транзакцию"
      >
        +
      </button>
    </div>
  );
}
// endregion PAGE_Dashboard
