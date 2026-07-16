// region COMPONENT_App [DOMAIN(9): Budget, FamilyFinance; CONCEPT(9): UI, Presentation; TECH(9): React19, Tailwind4, TypeScript]
// ## @component
// ## @purpose To render the complete Family Budget Tracker interface v2.0: transaction form with type/category selectors, balance card, period statistics, and transaction list with categories. All data logic delegated to useExpenses and useCategories hooks.
// ## @scope Transaction list display with categories, balance card, add transaction form, stats cards, delete interaction.
// ## @input None (uses useExpenses and useCategories hooks).
// ## @output Rendered React UI with Tailwind dark theme styling.
// ## @links [CALLS_HOOK: useExpenses, useCategories]
// ## @invariants
// ## - All data operations go through hooks — no direct fetch() in component.
// ## - Loading state disables the submit button.
// ## - Balance card shows green for positive, red for negative, white for zero.
// ## @rationale
// ## Q: Why keep state for transaction type in the component instead of the hook?
// ## A: Transaction type selection is a UI concern — it controls which form fields are shown. The hook handles data, the component handles presentation state.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Complete redesign: added type/category selectors, balance card, stats block, category display in list]
// ## @modulemap
// ## COMPONENT 10[Complete budget tracker UI v2.0] => App
function _module_contract(): void {}
// endregion COMPONENT_App
// GREP_SUMMARY: React, App, UI, transactions, balance, stats, categories, income, expense, form, list, Tailwind, Russian
// STRUCTURE: ▶ ┌useExpenses()┐ ⊕ ┌useCategories()┐ → ┌state: type, amount, desc, category_id┐ → ◇ toggle type (income/expense) → ○ category dropdown → ◇ form submit: addTransaction(type, amount, desc, category_id) → ⚡ balance card (green/red) → ⚡ stats grid (4 cards) → ⚡ transaction list (type+/-, category icon+name) → ⎋ JSX

import React, { useState } from 'react';
import { useExpenses } from './frontend/hooks/useExpenses.js';
import { useCategories } from './frontend/hooks/useCategories.js';

// region COMPONENT_App_Definition [DOMAIN(9): Budget; CONCEPT(9): UI; TECH(9): React19]
// ## @purpose To render the full budget tracker interface with transaction type selection, category picker, balance display, statistics, and categorized transaction list.
export default function App() {
    const { transactions, balance, stats, isLoading, error, clearError, addTransaction, deleteTransaction } = useExpenses();
    const { categories, error: catError } = useCategories();
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');

    // region HANDLER_handleSubmit [DOMAIN(9): Budget; CONCEPT(8): Form; TECH(7): React]
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;
        // BUG_FIX_CONTEXT: Russian locale uses comma (,) as decimal separator.
        // parseFloat("100,50") returns 100 (stops at comma). Replace , with . first.
        const normalizedAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(normalizedAmount) || normalizedAmount <= 0) {
            return;
        }
        await addTransaction(
            transactionType,
            normalizedAmount,
            description,
            categoryId ? parseInt(categoryId, 10) : null
        );
        setAmount('');
        setDescription('');
        setCategoryId('');
    };
    // endregion HANDLER_handleSubmit

    // region HANDLER_handleDelete [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(6): React]
    const handleDelete = async (id: number) => {
        await deleteTransaction(id);
    };
    // endregion HANDLER_handleDelete

    // Balance color coding
    const balanceColor = balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-white';

    // region RENDER_JSX [DOMAIN(8): UI; CONCEPT(9): JSX; TECH(9): Tailwind, React19]
    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-blue-500/30 selection:text-white pb-20">
            <div className="max-w-md mx-auto p-5 space-y-6">

                {/* Header */}
                <header className="pt-8 pb-4 text-center">
                    <h1 className="text-lg font-medium tracking-tight text-white">
                        Семейный бюджет{' '}
                        <span className="text-white/30 ml-2">/</span>{' '}
                        <span className="text-white/60 ml-2 italic text-sm">Трекер</span>
                    </h1>
                </header>

                {/* Error Display */}
                {(error || catError) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                        <span className="text-red-400 text-lg flex-shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-red-300 text-sm">{error || catError}</p>
                        </div>
                        <button
                            onClick={clearError}
                            className="text-red-400/60 hover:text-red-400 flex-shrink-0 p-1"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] border border-white/10 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center space-y-2">
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Текущий баланс</span>
                        <h2 className={`text-5xl font-light tracking-tighter italic font-serif ${balanceColor}`}>
                            {balance.toLocaleString('ru-RU')}{' '}
                            <span className="text-xl font-sans not-italic opacity-50">₽</span>
                        </h2>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none"></div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0F0F0F] border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Сегодня</span>
                        <p className="text-lg font-mono text-white/90 mt-1">
                            {stats.today.toLocaleString('ru-RU')} ₽
                        </p>
                    </div>
                    <div className="bg-[#0F0F0F] border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Вчера</span>
                        <p className="text-lg font-mono text-white/90 mt-1">
                            {stats.yesterday.toLocaleString('ru-RU')} ₽
                        </p>
                    </div>
                    <div className="bg-[#0F0F0F] border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Неделя</span>
                        <p className="text-lg font-mono text-white/90 mt-1">
                            {stats.this_week.toLocaleString('ru-RU')} ₽
                        </p>
                    </div>
                    <div className="bg-[#0F0F0F] border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Месяц</span>
                        <p className="text-lg font-mono text-white/90 mt-1">
                            {stats.this_month.toLocaleString('ru-RU')} ₽
                        </p>
                    </div>
                </div>

                {/* Add Transaction Form */}
                <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 space-y-5">
                    <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2">Новая операция</h3>

                    {/* Type Toggle */}
                    <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setTransactionType('expense')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                transactionType === 'expense'
                                    ? 'bg-red-500/20 text-red-400 shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            Расход
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('income')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                transactionType === 'income'
                                    ? 'bg-green-500/20 text-green-400 shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            Доход
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category Select */}
                        {transactionType === 'expense' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase text-white/30 ml-1">Категория</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors text-white appearance-none cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', paddingRight: '40px' }}
                                >
                                    <option value="" className="bg-[#1A1A1A] text-white/50">Без категории</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-[#1A1A1A] text-white">
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase text-white/30 ml-1">Сумма (₽)</label>
                            <input
                                type="text"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => {
                                    // BUG_FIX_CONTEXT: On mobile browsers, type="number" can prevent
                                    // e.target.value from being captured before keyboard dismissal.
                                    // Using type="text" + inputMode="decimal" + manual validation
                                    // ensures the value is always readable.
                                    const val = e.target.value;
                                    if (val === '' || /^\d*[.,]?\d*$/.test(val)) {
                                        setAmount(val);
                                    }
                                }}
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-2xl font-light focus:outline-none transition-colors placeholder:text-white/20 text-white ${
                                    transactionType === 'expense'
                                        ? 'border-white/10 focus:border-red-500/50'
                                        : 'border-white/10 focus:border-green-500/50'
                                }`}
                                required
                                inputMode="decimal"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase text-white/30 ml-1">Описание</label>
                            <input
                                type="text"
                                placeholder={transactionType === 'expense' ? 'Продукты, такси...' : 'Зарплата, подарок...'}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 text-white"
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !amount || !description}
                                className={`w-full text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:hover:bg-blue-600 ${
                                    transactionType === 'expense'
                                        ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                        : 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                                }`}
                            >
                                {isLoading
                                    ? 'Добавление...'
                                    : transactionType === 'expense'
                                        ? 'Добавить расход'
                                        : 'Добавить доход'
                                }
                            </button>
                        </div>
                    </form>
                </div>

                {/* Recent Transactions */}
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl mt-6">
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-sm font-medium text-white/90">Последние операции</h3>
                        <span className="text-[10px] text-white/30">{transactions.length} записей</span>
                    </div>

                    <div className="flex-1">
                        {transactions.length === 0 ? (
                            <div className="text-center py-10 text-white/40 text-sm">
                                Пока нет операций. Добавьте первую!
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/[0.03]">
                                {transactions.map(tx => (
                                    <li key={tx.id} className="group hover:bg-white/[0.02] transition-colors flex justify-between items-center px-6 py-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Type Indicator */}
                                            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                                tx.type === 'income' ? 'bg-green-400/80' : 'bg-red-400/80'
                                            }`} />

                                            <div className="flex flex-col min-w-0">
                                                {/* Category + Description */}
                                                <div className="flex items-center gap-2">
                                                    {tx.category_icon && (
                                                        <span className="text-sm flex-shrink-0">{tx.category_icon}</span>
                                                    )}
                                                    <span className="text-sm font-medium text-white/90 truncate">
                                                        {tx.description}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {tx.category_name && (
                                                        <span className="text-[10px] text-white/30 bg-white/[0.03] px-1.5 py-0.5 rounded">
                                                            {tx.category_name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-white/30">
                                                        {new Date(tx.date + 'Z').toLocaleString('ru-RU', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <strong className={`text-right font-mono text-sm ${
                                                tx.type === 'income' ? 'text-green-400' : 'text-white/90'
                                            }`}>
                                                {tx.type === 'income' ? '+' : '-'}
                                                {parseFloat(String(tx.amount)).toLocaleString('ru-RU')} ₽
                                            </strong>
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2"
                                                aria-label="Удалить"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    // endregion RENDER_JSX
}
// endregion COMPONENT_App_Definition
