// region COMPONENT_App [DOMAIN(8): Budget, FamilyFinance; CONCEPT(9): UI, Presentation; TECH(8): React19, Tailwind4, TypeScript]
// ## @component
// ## @purpose To render the complete user interface for the Family Budget Tracker вЂ” a list of expenses with total, an add-expense form, and delete buttons. This is a pure presentation component; all data logic is delegated to the useExpenses hook.
// ## @scope Expense list display, total card, add expense form, delete interaction.
// ## @input None (uses useExpenses hook for data).
// ## @output Rendered React UI with Tailwind styling.
// ## @links [CALLS_HOOK: src/frontend/hooks/useExpenses/useExpenses]
// ## @invariants
// ## - UI behavior is identical to the pre-refactored component.
// ## - No direct fetch() calls вЂ” all data operations go through useExpenses.
// ## - Loading state disables the submit button and shows "Р”РѕР±Р°РІР»РµРЅРёРµ..." text.
// ## @rationale
// ## Q: Why extract fetch logic into a hook?
// ## A: Separation of concerns вЂ” the component handles rendering, the hook handles data. This makes both independently testable and maintainable.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 вЂ“ Refactored: extracted fetch logic into useExpenses hook]
// ## @modulemap
// ## COMPONENT 9[Main expense tracker UI] => App
function _module_contract(): void {}
// endregion COMPONENT_App
// GREP_SUMMARY: React, App, UI, expenses, form, list, total, Tailwind
// STRUCTURE: в–¶ в”ЊuseExpenses() hookв”ђ в†’ в”Њstate: amount, descв”ђ в†’ в—‡ form submit: addExpense(amount, desc) + reset в†’ в—‡ delete click: deleteExpense(id) в†’ вЉ• total = reduce(expenses) в†’ вЋ‹ JSX: Header + TotalCard + Form + List

import React, { useState } from 'react';
import { useExpenses } from './frontend/hooks/useExpenses.js';

// region COMPONENT_App_Definition [DOMAIN(8): Budget; CONCEPT(9): UI; TECH(8): React19]
// ## @purpose To render the full expense tracker interface вЂ” identical behavior to the original pre-refactored component, but using the extracted useExpenses hook for data operations.
export default function App() {
    const { expenses, isLoading, addExpense, deleteExpense } = useExpenses();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    // region HANDLER_handleSubmit [DOMAIN(8): Budget; CONCEPT(8): Form; TECH(7): React]
    // ## @purpose To handle form submission: validate inputs, call addExpense from the hook, and reset the form fields.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        await addExpense(parseFloat(amount), description);
        setAmount('');
        setDescription('');
    };
    // endregion HANDLER_handleSubmit

    // region HANDLER_handleDelete [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(6): React]
    // ## @purpose To handle the delete button click by delegating to the useExpenses hook.
    const handleDelete = async (id: number) => {
        await deleteExpense(id);
    };
    // endregion HANDLER_handleDelete

    // Calculate total (pure UI calculation, no DB hit)
    const total = expenses.reduce((sum, exp) => sum + parseFloat(String(exp.amount)), 0);

    // region RENDER_JSX [DOMAIN(7): UI; CONCEPT(9): JSX; TECH(8): Tailwind]
    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-blue-500/30 selection:text-white pb-20">
            <div className="max-w-md mx-auto p-5 space-y-6">

                {/* Header */}
                <header className="pt-8 pb-4 text-center">
                    <h1 className="text-lg font-medium tracking-tight text-white">
                        РўСЂРµРєРµСЂ РўСЂР°С‚{' '}
                        <span className="text-white/30 ml-2">/</span>{' '}
                        <span className="text-white/60 ml-2 italic text-sm">РЎРµРјСЊСЏ</span>
                    </h1>
                </header>

                {/* Total Card */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] border border-white/10 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center space-y-2">
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Р’СЃРµРіРѕ РїРѕС‚СЂР°С‡РµРЅРѕ</span>
                        <h2 className="text-5xl font-light text-white tracking-tighter italic font-serif">
                            {total.toLocaleString('ru-RU')}{' '}
                            <span className="text-xl font-sans not-italic opacity-50">в‚ё</span>
                        </h2>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none"></div>
                </div>

                {/* Add Expense Form */}
                <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 space-y-5">
                    <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2">РќРѕРІР°СЏ С‚СЂР°С‚Р°</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase text-white/30 ml-1">РЎСѓРјРјР° (в‚ё)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-light focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 text-white"
                                required
                                inputMode="decimal"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase text-white/30 ml-1">РћРїРёСЃР°РЅРёРµ</label>
                            <input
                                type="text"
                                placeholder="РџСЂРѕРґСѓРєС‚С‹, С‚Р°РєСЃРё..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 text-white"
                                required
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !amount || !description}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
                            >
                                {isLoading ? 'Р”РѕР±Р°РІР»РµРЅРёРµ...' : 'Р”РѕР±Р°РІРёС‚СЊ С‚СЂР°С‚Сѓ'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Recent Expenses */}
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl mt-6">
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-sm font-medium text-white/90">РџРѕСЃР»РµРґРЅРёРµ С‚СЂР°С‚С‹</h3>
                    </div>

                    <div className="flex-1">
                        {expenses.length === 0 ? (
                            <div className="text-center py-10 text-white/40 text-sm">
                                РџРѕРєР° РЅРµС‚ С‚СЂР°С‚. Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІСѓСЋ!
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/[0.03]">
                                {expenses.map(exp => (
                                    <li key={exp.id} className="group hover:bg-white/[0.02] transition-colors flex justify-between items-center px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white/90">{exp.description}</span>
                                            <span className="text-[10px] text-white/30 mt-0.5">
                                                {new Date(exp.date + 'Z').toLocaleString('ru-RU', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <strong className="text-right font-mono text-sm text-white/90">
                                                {parseFloat(String(exp.amount)).toLocaleString('ru-RU')} в‚ё
                                            </strong>
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2"
                                                aria-label="РЈРґР°Р»РёС‚СЊ"
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
