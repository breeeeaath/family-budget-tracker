// region PAGE_History [DOMAIN(8): FinanceTracker; CONCEPT(7): TransactionHistory, Pagination; TECH(9): React, ReactQuery]
// ## @purpose Transaction history list with filters (type, dates, category) and "Load more" pagination.
// ## @uses useTransactions, useCategories, TransactionItem
// ## @complexity 7
// GREP_SUMMARY: History, transactions, filters, type, date, category, load more, pagination, infinite scroll
// STRUCTURE: ▶ Page → filters(type, start_date, end_date, category_id) → useTransactions(params) → ○ map(TransactionItem) → button(load more, offset+=limit)

import { useState, useEffect } from 'react';
import TransactionItem from '../components/TransactionItem';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';

const PAGE_SIZE = 15;

export default function History() {
  const [filters, setFilters] = useState({
    type: '',
    start_date: '',
    end_date: '',
    category_id: '',
  });
  const [offset, setOffset] = useState(0);
  const [allTx, setAllTx] = useState([]);

  const { data: categories } = useCategories();

  const params = {
    limit: PAGE_SIZE,
    offset,
    ...(filters.type && { type: filters.type }),
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.category_id && { category_id: filters.category_id }),
  };

  const { data, isLoading, isFetching } = useTransactions(params);

  const categoriesById = {};
  if (categories) {
    categories.forEach((c) => {
      categoriesById[c.id] = c;
    });
  }

  useEffect(() => {
    if (data) {
      const merged = (Array.isArray(data) ? data : data.transactions || data).map((tx) => {
        const cat = categoriesById[tx.category_id];
        return {
          ...tx,
          category_name: cat?.name || '—',
          icon: cat?.icon || '💰',
          color: cat?.color || '#888',
        };
      });
      setAllTx((prev) => (offset === 0 ? merged : [...prev, ...merged]));
    }
  }, [data, offset]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setOffset(0);
    setAllTx([]);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const dataArray = Array.isArray(data) ? data : data?.transactions;
  const hasMore = dataArray?.length === PAGE_SIZE;

  return (
    <div className="history-page">
      <h1 className="history-page__title">История</h1>

      <div className="history-filters">
        <select
          className="history-filters__select"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">Все типы</option>
          <option value="INCOME">Доходы</option>
          <option value="EXPENSE">Расходы</option>
        </select>

        <select
          className="history-filters__select"
          value={filters.category_id}
          onChange={(e) => handleFilterChange('category_id', e.target.value)}
        >
          <option value="">Все категории</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>

        <input
          className="history-filters__date"
          type="date"
          value={filters.start_date}
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          placeholder="С"
        />
        <input
          className="history-filters__date"
          type="date"
          value={filters.end_date}
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          placeholder="По"
        />
      </div>

      {isLoading && offset === 0 ? (
        <div className="history-page__loading">Загрузка...</div>
      ) : allTx.length === 0 ? (
        <div className="history-page__empty">Нет транзакций</div>
      ) : (
        <>
          <div className="history-list">
            {allTx.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>

          {hasMore && (
            <button
              className="history-page__load-more"
              onClick={handleLoadMore}
              disabled={isFetching}
            >
              {isFetching ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
// endregion PAGE_History
