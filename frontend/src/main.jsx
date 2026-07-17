// region MODULE_Main [DOMAIN(7): FinanceTracker; CONCEPT(6): Bootstrap; TECH(9): React18, Vite]
// ## @modulecontract
// ## @purpose Application entry point: renders React root and registers Service Worker for PWA.
// ## @scope DOM rendering, PWA service worker registration.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial entry point with PWA SW.]
// ## @modulemap
// ## ENTRY 10[ReactDOM render + SW register] => main
function _module_contract() {}
// endregion MODULE_Main
// GREP_SUMMARY: main, ReactDOM, createRoot, Service Worker, PWA, render, App, index.css
// STRUCTURE: ▶ import(index.css) → createRoot(root) → render(App) → navigator.serviceWorker.register('/sw.js')

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
// endregion MODULE_Main
