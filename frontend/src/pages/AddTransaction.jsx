// region PAGE_AddTransaction [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalEntry; TECH(9): React, OptimisticUpdate]
// ## @purpose Form to add a new transaction: type toggle (INCOME/EXPENSE), amount, category picker, note, submit with optimistic update.
// ## @uses useAddTransaction, useCategories, CategoryPicker
// ## @complexity 5
// GREP_SUMMARY: AddTransaction, form, amount, category picker, income, expense, note, optimistic, clear form
// STRUCTURE: ▶ Page → toggle(type:INCOME|EXPENSE) → input(amount) → CategoryPicker(type) → textarea(note) → submit(mutateAsync) → clear form

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddTransaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import CategoryPicker from '../components/CategoryPicker';

export default function AddTransaction() {
  const navigate = useNavigate();
  const addTx = useAddTransaction();
  const { data: categories } = useCategories();

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote] = useState('');

  const clearForm = () => {
    setAmount('');
    setCategoryId(null);
    setNote('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    await addTx.mutateAsync({
      amount: String(amount),
      type,
      category_id: categoryId,
      note: note || undefined,
    });

    clearForm();
    navigate('/dashboard');
  };

  return (
    <div className="add-transaction-page">
      <h1 className="add-transaction-page__title">
        {type === 'INCOME' ? 'Доход' : 'Расход'}
      </h1>

      <form className="add-transaction-form" onSubmit={handleSubmit}>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-toggle__btn ${type === 'INCOME' ? 'type-toggle__btn--income' : ''}`}
            onClick={() => setType('INCOME')}
          >
            Доход
          </button>
          <button
            type="button"
            className={`type-toggle__btn ${type === 'EXPENSE' ? 'type-toggle__btn--expense' : ''}`}
            onClick={() => setType('EXPENSE')}
          >
            Расход
          </button>
        </div>

        <label className="add-transaction-form__field">
          <span className="add-transaction-form__label">Сумма (руб.)</span>
          <input
            className="add-transaction-form__input"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            inputMode="decimal"
          />
        </label>

        <div className="add-transaction-form__field">
          <span className="add-transaction-form__label">Категория</span>
          <CategoryPicker
            type={type}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        <label className="add-transaction-form__field">
          <span className="add-transaction-form__label">Заметка</span>
          <textarea
            className="add-transaction-form__textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Необязательно"
            rows={3}
          />
        </label>

        <button
          className="add-transaction-form__submit"
          type="submit"
          disabled={addTx.isPending || !amount || !categoryId}
        >
          {addTx.isPending ? 'Добавление...' : 'Добавить'}
        </button>
      </form>
    </div>
  );
}
// endregion PAGE_AddTransaction
