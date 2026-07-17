// region MODULE_App [DOMAIN(8): FinanceTracker; CONCEPT(7): Routing, AuthGuard; TECH(9): React, ReactRouter, ReactQuery]
// ## @modulecontract
// ## @purpose Application root: configures QueryClientProvider, BrowserRouter, and protected routes.
// ## @scope Routing, auth guard, query client setup.
// ## @links [USES_PAGES: Login, Dashboard, AddTransaction, History, Profile]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial App setup with protected routes.]
// ## @modulemap
// ## COMPONENT 10[ProtectedRoute guard checking localStorage] => ProtectedRoute
// ## COMPONENT 10[Profile page with user info + logout] => ProfilePage
// ## COMPONENT 10[App root with providers and routes] => App
function _module_contract() {}
// endregion MODULE_App
// GREP_SUMMARY: App, QueryClientProvider, BrowserRouter, Routes, ProtectedRoute, localStorage, login, dashboard, history, add, profile
// STRUCTURE: ▶ QueryClientProvider → BrowserRouter → Routes → Login(unprotected) + Layout(protected) → [Dashboard, History, Add, Profile]

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import { useMe } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// region COMPONENT_ProtectedRoute [DOMAIN(7): Auth; CONCEPT(7): AccessControl; TECH(8): ReactRouter]
// ## @purpose Route guard: redirects to /login if localStorage 'isLoggedIn' flag is missing.
// ## @complexity 2
function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
// endregion COMPONENT_ProtectedRoute

// region COMPONENT_ProfilePage [DOMAIN(6): FinanceTracker; CONCEPT(5): UserProfile; TECH(7): React, useMe]
// ## @purpose Simple profile page showing user info and logout button.
// ## @uses useMe
// ## @complexity 3
function ProfilePage() {
  const { data: user, isLoading } = useMe();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <h1 className="profile-page__title">Профиль</h1>
        <div className="profile-page__loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 className="profile-page__title">Профиль</h1>
      {user ? (
        <div className="profile-page__info">
          <div className="profile-page__avatar">👤</div>
          <div className="profile-page__name">{user.name}</div>
          <div className="profile-page__id">ID: {user.user_id}</div>
        </div>
      ) : (
        <div className="profile-page__empty">Не авторизован</div>
      )}
      <button className="profile-page__logout" onClick={handleLogout}>
        Выйти
      </button>
    </div>
  );
}
// endregion COMPONENT_ProfilePage

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
// endregion COMPONENT_App
