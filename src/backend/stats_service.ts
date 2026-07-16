// region MODULE_CONTRACT [DOMAIN(8): Budget, Analytics; CONCEPT(9): Statistics, MonthlyRollover; TECH(8): better-sqlite3, TypeScript]
// ## @modulecontract
// ## @purpose To encapsulate all analytics and monthly rollover business logic: period-based expense statistics, opening balance retrieval, automatic month-end balance rollover, and combined balance calculation.
// ## @scope Expense statistics by time periods (today, yesterday, this week, this month), monthly balance rollover, opening/closing balance management.
// ## @input An open better-sqlite3 Database instance, a workspaceId string.
// ## @output StatsService instance with methods for getStats, getOpeningBalance, rolloverMonth, getBalance.
// ## @links [USES_API(8): better-sqlite3/Database; USES_DATA_FROM: db.ts/createDb; USES_TABLE: transactions, monthly_balance]
// ## @invariants
// ## - getStats() ALWAYS returns an object with today, yesterday, this_week, this_month (all numbers >= 0).
// ## - getOpeningBalance() ALWAYS returns a number (0 if no monthly_balance record exists).
// ## - rolloverMonth() is idempotent — if current month already has a record, it does nothing.
// ## - getBalance() ALWAYS returns a number (opening_balance + net income - net expenses).
// ## @rationale
// ## Q: Why separate StatsService from ExpenseService?
// ## A: Single Responsibility Principle — stats and rollover logic are orthogonal to CRUD. Separation keeps each module focused and testable.
// ## Q: Why auto-rollover in getBalance() call path?
// ## A: Ensures the opening balance is always current without requiring a separate cron job. The rollover only triggers once per month.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of StatsService with period stats, monthly rollover, and balance aggregation]
// ## @modulemap
// ## CLASS 9[Analytics and monthly balance rollover] => StatsService
// ##   METHOD 9[Get expense stats for today/yesterday/week/month] => getStats
// ##   METHOD 8[Get opening balance for current month] => getOpeningBalance
// ##   METHOD 9[Auto-rollover month-end balance] => rolloverMonth
// ##   METHOD 8[Get combined balance (opening + net transactions)] => getBalance
// ## @usecases
// ## - [StatsService.getStats]: UI (StatsCards) -> getStats -> Display period-based expense totals
// ## - [StatsService.rolloverMonth]: System (BalanceRequest) -> rolloverMonth -> Ensure current month opening balance exists
// ## - [StatsService.getBalance]: UI (BalanceCard) -> getBalance -> Display current balance with rollover
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: stats, analytics, statistics, monthly rollover, balance, opening balance, StatsService, getStats, rolloverMonth, getOpeningBalance, LDD
// STRUCTURE: ▶ StatsService ┌db, workspaceId┐ → ◇ getStats: ┌today SQL date('now')┐ ⊕ ┌yesterday SQL date('now','-1 day')┐ ⊕ ┌week SQL date('now','weekday 0','-6 days')┐ ⊕ ┌month SQL date('now','start of month')┐ → ∑ {today, yesterday, this_week, this_month} → ◇ rolloverMonth: ◇ ┌record exists for current month?┐ ─No→ ⚡ compute last month balance → INSERT opening_balance → ◇ getOpeningBalance: SELECT opening_balance ORDER BY id DESC LIMIT 1 → ◇ getBalance: getOpeningBalance() + SUM(CASE income/expense) → ⎋ result

import Database from 'better-sqlite3';

// region TYPES [DOMAIN(8): Budget; CONCEPT(7): Analytics; TECH(6): TypeScript]
// ## @purpose To define the shape of a stats response as returned by the getStats method.
export interface StatsResponse {
    today: number;
    yesterday: number;
    this_week: number;
    this_month: number;
}
// endregion TYPES

// region CLASS_StatsService [DOMAIN(8): Budget, Analytics; CONCEPT(9): Statistics, Rollover; TECH(8): TypeScript, better-sqlite3]
// ## @purpose To provide a clean, testable API for analytics and monthly balance rollover operations, ensuring workspace isolation.
export class StatsService {
    private db: Database.Database;
    private workspaceId: string;

    constructor(db: Database.Database, workspaceId: string = 'family_1') {
        this.db = db;
        this.workspaceId = workspaceId;
        console.log(`[IMP:6][StatsService][INIT] Workspace: ${workspaceId} [FLOW]`);
    }

    // region METHOD_getStats [DOMAIN(8): Budget; CONCEPT(9): Statistics; TECH(8): SQL]
    // ## @purpose To compute expense totals for four time periods (today, yesterday, this week, this month) using SQLite date functions, giving the UI a quick financial overview.
    // ## @uses this.db
    // ## @io [] -> [StatsResponse]
    // ## @complexity 7
    getStats(): StatsResponse {
        console.log(`[IMP:5][StatsService][getStats] Computing period stats for workspace: ${this.workspaceId} [FLOW]`);
        try {
            // Today
            const todayStmt = this.db.prepare(`
                SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
                FROM transactions
                WHERE workspace_id = ? AND type = 'expense' AND date >= date('now')
            `);
            const today = (todayStmt.get(this.workspaceId) as { total: number }).total;

            // Yesterday
            const yesterdayStmt = this.db.prepare(`
                SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
                FROM transactions
                WHERE workspace_id = ? AND type = 'expense'
                AND date >= date('now', '-1 day') AND date < date('now')
            `);
            const yesterday = (yesterdayStmt.get(this.workspaceId) as { total: number }).total;

            // This week (Monday to Sunday)
            const weekStmt = this.db.prepare(`
                SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
                FROM transactions
                WHERE workspace_id = ? AND type = 'expense'
                AND date >= date('now', 'weekday 0', '-6 days')
            `);
            const this_week = (weekStmt.get(this.workspaceId) as { total: number }).total;

            // This month
            const monthStmt = this.db.prepare(`
                SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
                FROM transactions
                WHERE workspace_id = ? AND type = 'expense'
                AND date >= date('now', 'start of month')
            `);
            const this_month = (monthStmt.get(this.workspaceId) as { total: number }).total;

            const result: StatsResponse = { today, yesterday, this_week, this_month };
            console.log(`[IMP:7][StatsService][getStats] Stats computed: ${JSON.stringify(result)} [IO]`);
            console.log(`[IMP:9][StatsService][getStats] Period stats ready [BUSINESS]`);
            return result;
        } catch (error) {
            console.error(`[IMP:10][StatsService][getStats] CRITICAL: Stats computation failed. workspace=${this.workspaceId} [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getStats

    // region METHOD_getOpeningBalance [DOMAIN(8): Budget; CONCEPT(8): Balance; TECH(7): SQL]
    // ## @purpose To retrieve the opening balance for the current period from the monthly_balance table, returning 0 if no record exists.
    // ## @uses this.db
    // ## @io [] -> [number]
    // ## @complexity 5
    getOpeningBalance(): number {
        console.log(`[IMP:5][StatsService][getOpeningBalance] Fetching opening balance for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();

            const stmt = this.db.prepare(`
                SELECT opening_balance FROM monthly_balance
                WHERE workspace_id = ? AND month = ? AND year = ?
                ORDER BY id DESC LIMIT 1
            `);
            const row = stmt.get(this.workspaceId, month, year) as { opening_balance: number } | undefined;
            const balance = row ? row.opening_balance : 0;
            console.log(`[IMP:7][StatsService][getOpeningBalance] Opening balance for ${year}-${month}: ${balance} [IO]`);
            return balance;
        } catch (error) {
            console.error(`[IMP:10][StatsService][getOpeningBalance] CRITICAL: Opening balance fetch failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getOpeningBalance

    // region METHOD_rolloverMonth [DOMAIN(8): Budget; CONCEPT(9): MonthlyRollover; TECH(8): SQL, BusinessLogic]
    // ## @purpose To automatically create a monthly balance rollover record for the current month if one does not already exist. Computes the previous month's net balance and uses it as the opening balance for the current month. Idempotent — safe to call on every balance request.
    // ## @uses this.db
    // ## @io [] -> [number]
    // ## @complexity 9
    rolloverMonth(): number {
        console.log(`[IMP:5][StatsService][rolloverMonth] Checking rollover for workspace: ${this.workspaceId} [FLOW]`);
        try {
            const now = new Date();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            const currentYear = now.getFullYear();

            // Check if monthly_balance record already exists for current month
            const checkStmt = this.db.prepare(`
                SELECT COUNT(*) as cnt FROM monthly_balance
                WHERE workspace_id = ? AND month = ? AND year = ?
            `);
            const { cnt } = checkStmt.get(this.workspaceId, currentMonth, currentYear) as { cnt: number };

            if (cnt > 0) {
                console.log(`[IMP:6][StatsService][rolloverMonth] Rollover record already exists for ${currentYear}-${currentMonth}, retrieving [FLOW]`);
                const currentOpening = this.getOpeningBalance();
                console.log(`[IMP:9][StatsService][rolloverMonth] Existing opening balance: ${currentOpening} [BUSINESS]`);
                return currentOpening;
            }

            // Compute last month's net balance
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthStr = String(lastMonth.getMonth() + 1).padStart(2, '0');
            const lastYearStr = lastMonth.getFullYear();

            // Check if we have a closing balance from last month's record
            const lastMonthStmt = this.db.prepare(`
                SELECT closing_balance FROM monthly_balance
                WHERE workspace_id = ? AND month = ? AND year = ?
                ORDER BY id DESC LIMIT 1
            `);
            const lastMonthRow = lastMonthStmt.get(this.workspaceId, lastMonthStr, lastYearStr) as { closing_balance: number } | undefined;

            let openingBalance: number;
            if (lastMonthRow) {
                // Use last month's closing balance
                openingBalance = lastMonthRow.closing_balance;
                console.log(`[IMP:7][StatsService][rolloverMonth] Found previous month closing_balance: ${openingBalance} [IO]`);
            } else {
                // Compute net balance from all transactions before this month
                const netStmt = this.db.prepare(`
                    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN CAST(amount AS REAL) ELSE -CAST(amount AS REAL) END), 0) as balance
                    FROM transactions
                    WHERE workspace_id = ? AND date < date('now', 'start of month')
                `);
                openingBalance = (netStmt.get(this.workspaceId) as { balance: number }).balance;
                console.log(`[IMP:7][StatsService][rolloverMonth] Computed net balance from transactions: ${openingBalance} [IO]`);

                // Also save last month's closing balance
                const closingStmt = this.db.prepare(`
                    INSERT INTO monthly_balance (month, year, opening_balance, closing_balance, workspace_id)
                    VALUES (?, ?, 0, ?, ?)
                `);
                closingStmt.run(lastMonthStr, lastYearStr, openingBalance, this.workspaceId);
                console.log(`[IMP:7][StatsService][rolloverMonth] Inserted closing balance for ${lastYearStr}-${lastMonthStr}: ${openingBalance} [IO]`);
            }

            // Insert current month's opening balance
            const insertStmt = this.db.prepare(`
                INSERT INTO monthly_balance (month, year, opening_balance, closing_balance, workspace_id)
                VALUES (?, ?, ?, 0, ?)
            `);
            insertStmt.run(currentMonth, currentYear, openingBalance, this.workspaceId);
            console.log(`[IMP:7][StatsService][rolloverMonth] Inserted opening balance for ${currentYear}-${currentMonth}: ${openingBalance} [IO]`);

            console.log(`[IMP:9][StatsService][rolloverMonth] Rollover completed. Opening balance: ${openingBalance} [BUSINESS]`);
            return openingBalance;
        } catch (error) {
            console.error(`[IMP:10][StatsService][rolloverMonth] CRITICAL: Rollover failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_rolloverMonth

    // region METHOD_getBalance [DOMAIN(8): Budget; CONCEPT(9): Balance; TECH(7): SQL]
    // ## @purpose To compute the current total balance by combining the monthly opening balance with the net sum of all transactions in the current month. Calls rolloverMonth() to ensure the opening balance is up to date.
    // ## @uses this.db, rolloverMonth(), getOpeningBalance()
    // ## @io [] -> [number]
    // ## @complexity 6
    getBalance(): number {
        console.log(`[IMP:5][StatsService][getBalance] Calculating total balance for workspace: ${this.workspaceId} [FLOW]`);
        try {
            // Ensure rollover is up to date
            const openingBalance = this.rolloverMonth();
            console.log(`[IMP:7][StatsService][getBalance] Opening balance: ${openingBalance} [IO]`);

            // Compute net transactions for current month
            const netStmt = this.db.prepare(`
                SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN CAST(amount AS REAL) ELSE -CAST(amount AS REAL) END), 0) as balance
                FROM transactions
                WHERE workspace_id = ?
            `);
            const netBalance = (netStmt.get(this.workspaceId) as { balance: number }).balance;
            console.log(`[IMP:7][StatsService][getBalance] Net transaction balance: ${netBalance} [IO]`);

            const totalBalance = openingBalance + netBalance;
            console.log(`[IMP:7][StatsService][getBalance] Total balance (opening ${openingBalance} + net ${netBalance}): ${totalBalance} [IO]`);
            console.log(`[IMP:9][StatsService][getBalance] Final balance computed: ${totalBalance} [BUSINESS]`);
            return totalBalance;
        } catch (error) {
            console.error(`[IMP:10][StatsService][getBalance] CRITICAL: Balance calculation failed [FATAL]`, error);
            throw error;
        }
    }
    // endregion METHOD_getBalance
}
// endregion CLASS_StatsService
