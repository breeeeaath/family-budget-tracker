// region PAGE_Login [DOMAIN(8): Auth; CONCEPT(7): LoginForm, RegisterForm; TECH(8): React, ReactQuery]
// ## @purpose Combined login/register page with two tabs, handles auth flow and redirects to dashboard on success.
// ## @uses useLogin, useRegister
// ## @complexity 6
// GREP_SUMMARY: Login, Register, tabs, auth, login form, register form, password, name
// STRUCTURE: ▶ Page → tab(Login|Register) → ◇ form{submit} → mutateAsync(login|register) → onSuccess → navigate(/dashboard)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';
import { useRegister } from '../hooks/useAuth';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();
  const isPending = login.isPending || register.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (tab === 'login') {
        await login.mutateAsync({ name, password });
      } else {
        await register.mutateAsync({ name, password });
      }
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err?.response?.data?.detail || err?.message || 'Ошибка авторизации';
      setError(msg);
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Wallet</h1>

      <div className="login-tabs">
        <button
          className={`login-tab ${tab === 'login' ? 'login-tab--active' : ''}`}
          onClick={() => setTab('login')}
        >
          Вход
        </button>
        <button
          className={`login-tab ${tab === 'register' ? 'login-tab--active' : ''}`}
          onClick={() => setTab('register')}
        >
          Регистрация
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="login-form__field">
          <span className="login-form__label">Имя</span>
          <input
            className="login-form__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="login-form__field">
          <span className="login-form__label">Пароль</span>
          <input
            className="login-form__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <div className="login-form__error">{error}</div>}

        <button className="login-form__submit" type="submit" disabled={isPending}>
          {isPending ? 'Загрузка...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}
// endregion PAGE_Login
