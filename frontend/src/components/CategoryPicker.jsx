// region COMPONENT_CategoryPicker [DOMAIN(8): FinanceTracker; CONCEPT(7): CategorySelection; TECH(8): React]
// ## @purpose Grid-based category picker filtered by transaction type with selection highlight.
// ## @uses useCategories
// ## @io ({ type, value, onChange }) -> JSX
// ## @complexity 3
// GREP_SUMMARY: CategoryPicker, grid, categories, type filter, selected highlight, income, expense
// STRUCTURE: ▶ useCategories → filter by type(INCOME|EXPENSE) → ○ map: grid item(icon+name, selected border) → onClick(onChange)
import { useCategories } from '../hooks/useCategories';

export default function CategoryPicker({ type, value, onChange }) {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return <div className="category-picker-loading">Загрузка категорий...</div>;
  }

  const filtered = (categories || []).filter((c) => c.type === type);

  if (filtered.length === 0) {
    return <div className="category-picker-empty">Нет категорий</div>;
  }

  return (
    <div className="category-picker-grid">
      {filtered.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`category-picker-item ${value === cat.id ? 'category-picker-item--selected' : ''}`}
          style={{
            borderColor: value === cat.id ? cat.color : 'transparent',
            '--cat-color': cat.color,
          }}
          onClick={() => onChange(cat.id)}
        >
          <span className="category-picker-icon">{cat.icon}</span>
          <span className="category-picker-name">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
// endregion COMPONENT_CategoryPicker
