// region MODULE_CONTRACT [DOMAIN(8): FinanceTracker; CONCEPT(7): HTTPClient; TECH(9): Axios]
// ## @modulecontract
// ## @purpose Centralized HTTP client with cookie-based auth, exposing all backend API endpoints as plain functions.
// ## @scope Auth (register/login/me), Categories (list/create), Transactions (create/list), Analytics (summary/byCategory).
// ## @input None (functions accept params).
// ## @output Promise-based API response data.
// ## @links [USES_API(9): localhost:8000 /auth/*, /api/*]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial API client.]
// ## @modulemap
// ## CONST 10[Axios instance with withCredentials] => apiClient
// ## OBJ 10[auth endpoints] => authAPI
// ## OBJ 10[category endpoints] => categoriesAPI
// ## OBJ 10[transaction endpoints] => transactionsAPI
// ## OBJ 10[analytics endpoints] => analyticsAPI
function _module_contract() {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: axios, apiClient, authAPI, categoriesAPI, transactionsAPI, analyticsAPI, withCredentials, login, register, me
// STRUCTURE: ▶ apiClient(axios.create{withCredentials}) → authAPI{login,register,me} → categoriesAPI{list,create} → transactionsAPI{create,list} → analyticsAPI{summary,byCategory}

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// region OBJ_authAPI [DOMAIN(8): Auth; CONCEPT(7): SessionManagement; TECH(9): Axios]
// ## @purpose Auth-related API calls: login, register, fetch current user.
const authAPI = {
  login: (name, password) =>
    apiClient.post('/auth/login', { name, password }).then((r) => r.data),

  register: (name, password) =>
    apiClient.post('/auth/register', { name, password }).then((r) => r.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data),
};
// endregion OBJ_authAPI

// region OBJ_categoriesAPI [DOMAIN(8): FinanceTracker; CONCEPT(7): CategoryCRUD; TECH(9): Axios]
// ## @purpose Category API calls: list all, create new.
const categoriesAPI = {
  list: () => apiClient.get('/api/categories').then((r) => r.data),

  create: (data) => apiClient.post('/api/categories', data).then((r) => r.data),
};
// endregion OBJ_categoriesAPI

// region OBJ_transactionsAPI [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalCRUD; TECH(9): Axios]
// ## @purpose Transaction API calls: create, list with filters.
const transactionsAPI = {
  create: (data) =>
    apiClient.post('/api/transactions', data).then((r) => r.data),

  list: (params) =>
    apiClient.get('/api/transactions', { params }).then((r) => r.data),
};
// endregion OBJ_transactionsAPI

// region OBJ_analyticsAPI [DOMAIN(8): FinanceTracker; CONCEPT(7): Aggregation; TECH(9): Axios]
// ## @purpose Analytics API calls: dashboard summary, spending by category.
const analyticsAPI = {
  summary: () => apiClient.get('/api/analytics/summary').then((r) => r.data),

  byCategory: () =>
    apiClient.get('/api/analytics/by-category').then((r) => r.data),
};
// endregion OBJ_analyticsAPI

export { apiClient, authAPI, categoriesAPI, transactionsAPI, analyticsAPI };
