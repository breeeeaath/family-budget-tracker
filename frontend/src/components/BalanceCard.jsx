// region COMPONENT_BalanceCard [DOMAIN(8): FinanceTracker; CONCEPT(7): DashboardWidget; TECH(8): React]
// ## @purpose Displays total balance with color coding (green/red) and three mini indicators for daily/monthly expenses and income.
// ## @io ({ data, isLoading }) -> JSX
// ## @complexity 4
// GREP_SUMMARY: BalanceCard, dashboard, balance, expense_today, expense_this_month, income_this_month, green, red
// STRUCTURE: ▶ isLoading ? Skeleton : ◇ render(balance green|red) → ⊕ minicards[expense_today, expense_this_month, income_this_month]

function formatAmount(val) {
  const num = Number(val);
  if (isNaN(num)) return '0.00';
  return num
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    .replace('.', ',');
}

export default function BalanceCard({ data, isLoading }) {
  if (isLoading) {
    return <div className="balance-card balance-card--loading">Загрузка...</div>;
  }

  if (!data) {
    return <div className="balance-card balance-card--empty">Нет данных</div>;
  }

  const balance = Number(data.total_balance);
  const isPositive = balance >= 0;

  return (
    <div className={`balance-card ${isPositive ? 'balance-card--positive' : 'balance-card--negative'}`}>
      <div className="balance-card__main">
        <div className="balance-card__label">Баланс</div>
        <div className="balance-card__amount">
          {isPositive ? '+' : '-'}{formatAmount(Math.abs(balance))} руб.
        </div>
      </div>

      <div className="balance-card__minis">
        <div className="balance-card__mini">
          <div className="balance-card__mini-label">Сегодня</div>
          <div className="balance-card__mini-value balance-card__mini-value--expense">
            -{formatAmount(data.expense_today)} руб.
          </div>
        </div>
        <div className="balance-card__mini">
          <div className="balance-card__mini-label">Расходы (мес)</div>
          <div className="balance-card__mini-value balance-card__mini-value--expense">
            -{formatAmount(data.expense_this_month)} руб.
          </div>
        </div>
        <div className="balance-card__mini">
          <div className="balance-card__mini-label">Доходы (мес)</div>
          <div className="balance-card__mini-value balance-card__mini-value--income">
            +{formatAmount(data.income_this_month)} руб.
          </div>
        </div>
      </div>
    </div>
  );
}
// endregion COMPONENT_BalanceCard
