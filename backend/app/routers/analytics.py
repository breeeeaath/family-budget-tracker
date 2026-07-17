# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, API; CONCEPT(7): Analytics, Aggregation; TECH(9): FastAPIRouter, SQLAlchemyCase, GROUP_BY]
## @modulecontract
## @purpose Expose analytics endpoints that compute dashboard aggregates (balance, today/month totals) and per‑category breakdowns. All computations run as single SQL queries for performance.
## @scope GET /api/analytics/summary, GET /api/analytics/by-category.
## @input current_user (cookie), optional date range + transaction type for by‑category.
## @output DashboardSummaryOut, List[CategoryStatOut].
## @links [DEPENDS_ON(9): backend.app.dependencies.get_current_user, get_db; backend.app.models.Transaction, Category; backend.app.schemas.DashboardSummaryOut, CategoryStatOut]
## @invariants
## - summary endpoint computes all 4 aggregates in ONE SQL round‑trip.
## - total_balance = SUM(INCOME) - SUM(EXPENSE).
## - by‑category endpoint requires both start_date and end_date.
## - All analytics are user‑scoped (filtered by current_user).
## @rationale
## Q: Why one SQL query for summary?
## A: Multiple round‑trips for total_balance, expense_today, expense_this_month, income_this_month would be an N+1 anti‑pattern. A single CASE‑based query avoids this.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial analytics router with dashboard summary and category breakdowns.]
## @modulemap
## ENDPOINT 10[Single‑query dashboard summary] => GET /api/analytics/summary
## ENDPOINT 9[Per‑category aggregation with date filter] => GET /api/analytics/by-category
## @usecases
## - [summary]: DashboardWidget → GET /api/analytics/summary → {total_balance, expense_today, expense_this_month, income_this_month} → render cards
## - [by_category]: PieChartWidget → GET /api/analytics/by-category?start_date=...&end_date=... → [{category_name, total_amount, icon, color}] → render chart
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: analytics, router, FastAPI, APIRouter, dashboard, summary, by-category, CASE, aggregate, GROUP BY, total_balance, expense_today, DashboardSummaryOut, CategoryStatOut
# STRUCTURE: ▶ GET /api/analytics/summary → ◇ auth → ⚡ select(CASE income+expense+today+month) → ⟦DashboardSummaryOut⟧; ▶ GET /api/analytics/by-category → ◇ auth + dates + type → ⚡ JOIN categories GROUP BY → ○ ORDER BY total_amount DESC → ⟦List[CategoryStatOut]⟧

import logging
from datetime import datetime, date, time as dt_time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.sql import and_

from backend.app.dependencies import get_db, get_current_user
from backend.app.models import Category, Transaction, TransactionTypeEnum
from backend.app.schemas import DashboardSummaryOut, CategoryStatOut, TransactionType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# region ENDPOINT_dashboard_summary [DOMAIN(9): FinanceTracker; CONCEPT(8): Analytics, Dashboard; TECH(9): FastAPI, SQLAlchemyCase]
## @purpose Compute the dashboard summary in a single SQL query: total_balance (income−expense), expense_today, expense_this_month, income_this_month — all scoped to the authenticated user.
## @uses get_current_user, get_db, Transaction ORM
## @io Cookie(token) -> DashboardSummaryOut
## @complexity 6
@router.get("/summary", response_model=DashboardSummaryOut)
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    today = func.current_date()
    month_now = func.extract("month", today)
    year_now = func.extract("year", today)

    stmt = select(
        func.coalesce(
            func.sum(case((Transaction.type == TransactionTypeEnum.INCOME, Transaction.amount), else_=0)), 0
        ).label("total_income"),
        func.coalesce(
            func.sum(case((Transaction.type == TransactionTypeEnum.EXPENSE, Transaction.amount), else_=0)), 0
        ).label("total_expense"),
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(
                            Transaction.type == TransactionTypeEnum.EXPENSE,
                            func.date(Transaction.created_at) == today,
                        ),
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("expense_today"),
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(
                            Transaction.type == TransactionTypeEnum.EXPENSE,
                            func.extract("month", Transaction.created_at) == month_now,
                            func.extract("year", Transaction.created_at) == year_now,
                        ),
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("expense_this_month"),
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(
                            Transaction.type == TransactionTypeEnum.INCOME,
                            func.extract("month", Transaction.created_at) == month_now,
                            func.extract("year", Transaction.created_at) == year_now,
                        ),
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("income_this_month"),
    ).where(Transaction.user_id == user_id)

    logger.debug(f"[IMP:5][dashboard_summary][QUERY] Computing summary for user_id={user_id}.")

    result = await db.execute(stmt)
    row = result.one()

    total_income = row.total_income
    total_expense = row.total_expense
    total_balance = total_income - total_expense
    expense_today = row.expense_today
    expense_this_month = row.expense_this_month
    income_this_month = row.income_this_month

    logger.info(
        f"[IMP:9][dashboard_summary][RESULT] user_id={user_id} total_balance={total_balance} "
        f"expense_today={expense_today} expense_month={expense_this_month} income_month={income_this_month}. [BUSINESS_ACTION]"
    )

    return DashboardSummaryOut(
        total_balance=total_balance,
        expense_today=expense_today,
        expense_this_month=expense_this_month,
        income_this_month=income_this_month,
    )
# endregion ENDPOINT_dashboard_summary


# region ENDPOINT_stats_by_category [DOMAIN(9): FinanceTracker; CONCEPT(8): Analytics, PieChart; TECH(9): FastAPI, SQLAlchemyJoin, GROUP_BY]
## @purpose Compute per‑category aggregated amounts for a given date range and transaction type. Returns data ready for pie‑chart rendering with icon and color.
## @uses get_current_user, get_db, Transaction ORM, Category ORM
## @io query params -> List[CategoryStatOut]
## @complexity 6
@router.get("/by-category", response_model=list[CategoryStatOut])
async def stats_by_category(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user),
    start_date: date = Query(...),
    end_date: date = Query(...),
    type: TransactionType = Query(default=TransactionType.EXPENSE),
):
    start_dt = datetime.combine(start_date, dt_time.min)
    end_dt = datetime.combine(end_date, dt_time.max)

    stmt = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            Category.icon,
            Category.color,
            func.coalesce(func.sum(Transaction.amount), 0).label("total_amount"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == type.value,
                Transaction.created_at.between(start_dt, end_dt),
            )
        )
        .group_by(Category.id, Category.name, Category.icon, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )

    logger.info(
        f"[IMP:8][stats_by_category][QUERY] Aggregating by category for user_id={user_id} "
        f"type={type.value} from {start_date.isoformat()} to {end_date.isoformat()}. [BOUNDARY]"
    )

    result = await db.execute(stmt)
    rows = result.all()

    logger.info(f"[IMP:8][stats_by_category][RESULT] Returned {len(rows)} category stats for user_id={user_id}. [BOUNDARY]")
    return [
        CategoryStatOut(
            category_id=row.category_id,
            category_name=row.category_name,
            total_amount=row.total_amount,
            icon=row.icon,
            color=row.color,
        )
        for row in rows
    ]
# endregion ENDPOINT_stats_by_category
