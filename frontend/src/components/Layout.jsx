// region COMPONENT_Layout [DOMAIN(8): FinanceTracker; CONCEPT(7): Navigation; TECH(8): React, react-router-dom]
// ## @purpose Bottom tab bar layout with 4 tabs: Главная, История, + (add), Профиль.
// ## @uses NavLink, Outlet
// ## @io () -> JSX
// ## @complexity 3
// GREP_SUMMARY: Layout, BottomTabBar, navigation, Главная, История, Профиль, add, NavLink
// STRUCTURE: ▶ Layout → main(Outlet) → nav(4 tab buttons: Главная|История|+|Профиль) → active highlight

import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/dashboard', label: 'Главная', icon: '🏠' },
  { to: '/history', label: 'История', icon: '📋' },
  { to: '/add', label: '', icon: '➕' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="bottom-tab-bar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `bottom-tab ${isActive ? 'bottom-tab--active' : ''}`
            }
          >
            <span className="bottom-tab__icon">{tab.icon}</span>
            {tab.label && <span className="bottom-tab__label">{tab.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
// endregion COMPONENT_Layout
