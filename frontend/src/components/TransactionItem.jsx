// region COMPONENT_TransactionItem [DOMAIN(8): FinanceTracker; CONCEPT(7): ListItem; TECH(8): React]
// ## @purpose Single transaction row: amount (colored), category icon+name, date, optional note.
// ## @io ({ transaction }) -> JSX
// ## @complexity 2
// GREP_SUMMARY: TransactionItem, amount color, category, date, note, income green, expense red
// STRUCTURE: ▶ transaction → ◇ amount(green income|red expense) + icon + name + date + note? → ⎋ JSX row

function formatAmount(val) {
  const num = Number(val);
  if (isNaN(num)) return '0.00';
  return num
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    .replace('.', ',');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function TransactionItem({ transaction }) {
  const isIncome = transaction.type === 'INCOME';
  const amount = Number(transaction.amount);
  const sign = isIncome ? '+' : '-';

  return (
    <div className="transaction-item">
      <div className="transaction-item__left">
        <div className="transaction-item__icon" style={{ color: transaction.color || '#888' }}>
          {transaction.icon || '💰'}
        </div>
        <div className="transaction-item__info">
          <div className="transaction-item__category">{transaction.category_name}</div>
          {transaction.note && (
            <div className="transaction-item__note">{transaction.note}</div>
          )}
          <div className="transaction-item__date">{formatDate(transaction.created_at)}</div>
        </div>
      </div>
      <div className={`transaction-item__amount ${isIncome ? 'transaction-item__amount--income' : 'transaction-item__amount--expense'}`}>
        {sign}{formatAmount(amount)} руб.
      </div>
    </div>
  );
}
// endregion COMPONENT_TransactionItem
