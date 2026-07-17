# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, API; CONCEPT(7): JournalEntry, DataIntegrity; TECH(9): FastAPIRouter, DECIMAL]
## @modulecontract
## @purpose Expose transaction journal endpoints with strict type‑category consistency enforcement. Every financial operation is validated, persisted, and queryable with filtering and pagination.
## @scope POST /api/transactions, GET /api/transactions.
## @input TransactionCreate (body), current_user (cookie), query filters (type, dates, category_id, limit, offset).
## @output TransactionOut | List[TransactionOut], 404 for missing category, 422 for type mismatch or invalid amount.
## @links [DEPENDS_ON(9): backend.app.dependencies.get_current_user, get_db; backend.app.models.Transaction, Category; backend.app.schemas.TransactionCreate, TransactionOut]
## @invariants
## - Transaction.type MUST match Category.type — enforced at application layer with 422.
## - Every transaction is scoped to the authenticated user via user_id FK.
## - List endpoint always returns newest first (created_at DESC).
## - Pagination via limit (default 50) and offset (default 0).
## @rationale
## Q: Why enforce type‑category consistency in the application layer?
## A: An EXPENSE‑category transaction with INCOME type creates data integrity corruption that cascades into analytics. DB constraints can't express this; application guard is the only safe path.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial transactions router with type‑consistency guard.]
## @modulemap
## ENDPOINT 10[Create transaction with type‑category guard] => POST /api/transactions
## ENDPOINT 9[List transactions with filters + pagination] => GET /api/transactions
## @usecases
## - [create]: AuthenticatedUser → POST /api/transactions with TransactionCreate → validate category type → persist → TransactionOut
## - [list]: AuthenticatedUser → GET /api/transactions?type=EXPENSE&start_date=... → filtered paginated results
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: transactions, router, FastAPI, APIRouter, TransactionCreate, TransactionOut, type consistency, category validation, pagination, DECIMAL, filters, created_at DESC
# STRUCTURE: ▶ POST /api/transactions → ◇ auth + load Category → ◇ category.type == tx.type.value ? T/F → 422 | ◇ Transaction insert → ⟦TransactionOut⟧; ▶ GET /api/transactions → ◇ auth → ○ apply filters(type,dates,category_id) → ○ pagination(limit,offset) → ○ order_by(created_at DESC) → ⟦List[TransactionOut]⟧

import logging
from datetime import datetime, date, time as dt_time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import and_

from backend.app.dependencies import get_db, get_current_user
from backend.app.models import Category, Transaction, TransactionTypeEnum
from backend.app.schemas import TransactionCreate, TransactionOut, TransactionType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


# region ENDPOINT_create_transaction [DOMAIN(9): FinanceTracker; CONCEPT(8): DataIntegrity, JournalEntry; TECH(9): FastAPI, SQLAlchemyInsert]
## @purpose Create a new financial transaction with mandatory type‑category consistency validation. Rejects mismatched category types with 422, missing categories with 404, and persists with current_user ownership.
## @uses get_current_user, get_db, Category ORM, Transaction ORM
## @io TransactionCreate -> TransactionOut
## @complexity 6
@router.post("", response_model=TransactionOut, status_code=201)
async def create_transaction(
    body: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    logger.info(f"[IMP:9][create_transaction][ATTEMPT] Creating tx type={body.type.value} amount={body.amount} category_id={body.category_id} for user_id={user_id}. [BUSINESS_ACTION]")

    result = await db.execute(select(Category).where(Category.id == body.category_id))
    category = result.scalar_one_or_none()

    if category is None:
        logger.warning(f"[IMP:8][create_transaction][CATEGORY_404] Category id={body.category_id} not found. [BOUNDARY]")
        raise HTTPException(status_code=404, detail="Category not found")

    if category.type.value != body.type.value:
        logger.warning(
            f"[IMP:9][create_transaction][TYPE_MISMATCH] Category id={category.id} type={category.type.value} does not match tx type={body.type.value}. Consistency violation. [BUSINESS_ACTION]"
        )
        raise HTTPException(status_code=422, detail="Transaction type does not match category type")

    if body.amount <= 0:
        logger.warning(f"[IMP:7][create_transaction][INVALID_AMOUNT] amount={body.amount} is not positive. [BOUNDARY]")
        raise HTTPException(status_code=422, detail="Amount must be greater than zero")

    created_dt = body.created_at if body.created_at else datetime.utcnow()

    transaction = Transaction(
        amount=body.amount,
        type=body.type.value,
        category_id=body.category_id,
        user_id=user_id,
        note=body.note,
        created_at=created_dt,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    logger.info(f"[IMP:9][create_transaction][CREATED] Transaction id={transaction.id} amount={transaction.amount} type={transaction.type.value} user_id={user_id}. [BUSINESS_ACTION]")
    return TransactionOut.model_validate(transaction)
# endregion ENDPOINT_create_transaction


# region ENDPOINT_list_transactions [DOMAIN(8): FinanceTracker; CONCEPT(7): Querying; TECH(9): FastAPI, SQLAlchemySelect, Pagination]
## @purpose Return a paginated, filtered, and sorted list of the authenticated user's transactions. Supports optional type, date range, and category filters.
## @uses get_current_user, get_db, Transaction ORM
## @io query params -> List[TransactionOut]
## @complexity 6
@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    type: TransactionType | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    category_id: int | None = Query(None),
):
    conditions = [Transaction.user_id == user_id]

    if type is not None:
        conditions.append(Transaction.type == type.value)
        logger.debug(f"[IMP:5][list_transactions][FILTER] type={type.value}.")
    if start_date is not None:
        start_dt = datetime.combine(start_date, dt_time.min)
        conditions.append(Transaction.created_at >= start_dt)
        logger.debug(f"[IMP:5][list_transactions][FILTER] start_date={start_date.isoformat()}.")
    if end_date is not None:
        end_dt = datetime.combine(end_date, dt_time.max)
        conditions.append(Transaction.created_at <= end_dt)
        logger.debug(f"[IMP:5][list_transactions][FILTER] end_date={end_date.isoformat()}.")
    if category_id is not None:
        conditions.append(Transaction.category_id == category_id)
        logger.debug(f"[IMP:5][list_transactions][FILTER] category_id={category_id}.")

    stmt = (
        select(Transaction)
        .where(and_(*conditions))
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    logger.debug(f"[IMP:5][list_transactions][QUERY] limit={limit} offset={offset} conditions_count={len(conditions)}.")
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    logger.debug(f"[IMP:5][list_transactions][RESULT] Returned {len(transactions)} transactions for user_id={user_id}.")
    return [TransactionOut.model_validate(t) for t in transactions]
# endregion ENDPOINT_list_transactions
