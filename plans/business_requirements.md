$START_DOC_NAME

**PURPOSE:** Формализовать бизнес-требования к приложению «Wallet» — персональному PWA-трекеру финансов для двух пользователей.
**SCOPE:** Функциональные и нефункциональные требования, доменная модель, сценарии использования.
**KEYWORDS:** Finance, ExpenseTracker, PWA, FastAPI, React, PostgreSQL, JWT, DECIMAL

$START_DOCUMENT_PLAN
### Document Plan
**SECTION_GOALS:**
- GOAL Инфраструктурные и нефункциональные требования => NFR_001
- GOAL Доменная модель и инварианты данных => DOM_001
- GOAL API-контракты и маршруты => API_001
- GOAL Фронтенд-архитектура и UX-принципы => UX_001

**SECTION_USE_CASES:**
- USE_CASE Добавление расхода стоя на кассе => UC_001
- USE_CASE Просмотр дашборда с аналитикой => UC_002
- USE_CASE Авторизация в PWA => UC_003
$END_DOCUMENT_PLAN

$START_SECTION_GOALS
### Goals & Non-Functional Requirements

$START_ARTIFACT_NFR_001
#### NFR_001 — Infrastructure

**TYPE:** NFR
**KEYWORDS:** TCO, VPS, Caddy, PostgreSQL, Monorepo

$START_CONTRACT
**PURPOSE:** Обеспечить минимальную стоимость владения (TCO) при сохранении аналитической мощности.
**DESCRIPTION:**
- Одно VPS ($5/мес) — весь стек: PWA + обратный прокси + API + БД.
- Caddy как reverse proxy с автоматическим Let's Encrypt (zero-config SSL).
- PostgreSQL вместо SQLite для аналитических запросов (DATE_TRUNC, GROUP BY).
- Docker Compose для деплоя (один docker-compose.yml).
- Деньги — ТОЛЬКО DECIMAL(12,2), никаких float.
**RATIONALE:** Два пользователя не оправдывают микросервисную архитектуру. PostgreSQL критичен для дашборда.
**ACCEPTANCE_CRITERIA:**
- Все компоненты поднимаются одной командой `docker compose up`.
- Caddy получает SSL-сертификат автоматически.
- Все денежные поля в схеме БД — DECIMAL(12,2).
$END_CONTRACT
$END_ARTIFACT_NFR_001

$START_ARTIFACT_DOM_001
#### DOM_001 — Domain Model

**TYPE:** DATA_FORMAT
**KEYWORDS:** users, categories, transactions, DECIMAL, ENUM, INCOME, EXPENSE

$START_CONTRACT
**PURPOSE:** Определить реляционную схему, гарантирующую финансовую целостность.
**DESCRIPTION:**
Таблицы:
- `users`: id (SERIAL PK), name (VARCHAR(100)), password_hash (VARCHAR(256))
- `categories`: id (SERIAL PK), name (VARCHAR(64)), type (ENUM 'INCOME','EXPENSE'), icon (VARCHAR(32)), color (VARCHAR(7))
- `transactions`: id (SERIAL PK), amount (DECIMAL(12,2) NOT NULL), type (ENUM 'INCOME','EXPENSE'), category_id (FK->categories), user_id (FK->users), created_at (TIMESTAMP NOT NULL DEFAULT NOW()), note (TEXT)
- Инвариант: `transactions.type` дублирует `categories.type` — денормализация для быстрого подсчёта баланса без JOIN. Сервер проверяет консистентность при создании.
**RATIONALE:** DECIMAL гарантирует точность. Денормализация type ускоряет дашборд. ENUM жёстко ограничивает значения.
**ACCEPTANCE_CRITERIA:**
- Суммы хранятся с точностью до копейки (2 знака).
- Невозможно создать транзакцию с несовпадающими типами (транзакция vs категория).
- Невозможно создать транзакцию с отрицательной суммой.
$END_CONTRACT
$END_ARTIFACT_DOM_001

$END_SECTION_GOALS

$START_SECTION_USE_CASES
### Use Cases

$START_ARTIFACT_UC_001
#### UC_001 — Add Transaction (Optimistic)

**TYPE:** USE_CASE
**KEYWORDS:** OptimisticUpdate, ReactQuery, PWA, FastAPI

$START_CONTRACT
**PURPOSE:** Пользователь добавляет расход/доход мгновенно, не дожидаясь ответа сервера.
**DESCRIPTION:**
- Actor: Пользователь (П)
- П открывает PWA → видит форму (сумма, категория, тип, заметка)
- П вводит сумму 250.00, выбирает «Продукты» (EXPENSE) → нажимает «Добавить»
- Фронтенд выполняет Optimistic Update: баланс сразу уменьшается на 250, запись появляется в ленте
- React Query отправляет POST /transactions на FastAPI
- FastAPI валидирует: amount > 0, CONVERT(DECIMAL), совпадение type с категорией
- Если ошибка — React Query откатывает UI
**RATIONALE:** Стоя на кассе, пользователь не может ждать. Optimistic Update = нативный UX.
**ACCEPTANCE_CRITERIA:**
- Запись появляется в UI до получения HTTP-ответа.
- При ошибке сервера UI откатывается.
- Сумма 250.00 хранится как DECIMAL '250.00' без потери точности.
$END_CONTRACT
$END_ARTIFACT_UC_001

$START_ARTIFACT_UC_002
#### UC_002 — Dashboard Analytics

**TYPE:** USE_CASE
**KEYWORDS:** Dashboard, PieChart, DATE_TRUNC, SQL

$START_CONTRACT
**PURPOSE:** Показать сводку: общий баланс, расходы сегодня/месяц, круговая диаграмма по категориям.
**DESCRIPTION:**
- Actor: Пользователь (П)
- П открывает PWA → видит Dashboard
- GET /analytics/summary → total_balance, expense_today, expense_this_month, income_this_month
- GET /analytics/by-category → группировка по категориям за выбранный период → Pie Chart (Recharts)
- Все расчёты на стороне PostgreSQL (DATE_TRUNC, SUM с CASE)
**RATIONALE:** Вынос агрегации в SQL разгружает Python и использует сильные стороны PostgreSQL.
**ACCEPTANCE_CRITERIA:**
- Баланс = SUM(income) - SUM(expense) пересчитывается корректно.
- Круговая диаграмма отображает доли категорий в процентах.
- Фильтр по датам работает включительно (start_date <= created_at <= end_date).
$END_CONTRACT
$END_ARTIFACT_UC_002

$START_ARTIFACT_UC_003
#### UC_003 — Authentication

**TYPE:** USE_CASE
**KEYWORDS:** JWT, HttpOnly, bcrypt, long-lived

$START_CONTRACT
**PURPOSE:** Идентификация одного из двух пользователей через JWT-токен.
**DESCRIPTION:**
- Actor: Пользователь (П)
- П вводит имя + пароль → POST /auth/login → получает HttpOnly cookie с JWT
- JWT содержит user_id, срок жизни — 30 дней
- Все защищённые эндпоинты читают токен из cookie → извлекают user_id
- Пароли хешируются bcrypt (passlib)
**RATIONALE:** HttpOnly cookie защищает от XSS-кражи токена. 30 дней = удобство для 2 пользователей.
**ACCEPTANCE_CRITERIA:**
- Токен недоступен из JavaScript (HttpOnly).
- Неверный пароль → 401.
- Просроченный токен → 401, редирект на логин.
$END_CONTRACT
$END_ARTIFACT_UC_003

$END_SECTION_USE_CASES

$END_DOC_NAME
