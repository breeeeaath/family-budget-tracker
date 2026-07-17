# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, DataModel; CONCEPT(7): ORM, RelationalSchema; TECH(9): SQLAlchemyDeclarative, Enum, DECIMAL]
## @modulecontract
## @purpose Define the canonical relational schema for the Wallet domain via SQLAlchemy ORM models. Every table constraint, foreign key, and type precision is encoded here as the single source of truth for DB migrations and query contracts.
## @scope User accounts, category dictionary, transaction journal.
## @input None (declarative models inherit from database.Base).
## @output Three mapped classes: User, Category, Transaction — consumed by alembic, routers, and analytics queries.
## @links [DEPENDS_ON(9): backend.app.database.Base]
## @invariants
## - amount is always DECIMAL(12,2) — no float drift.
## - category.type must match transaction.type at the application layer.
## - user_id is a required FK on every transaction.
## @rationale
## Q: Why DECIMAL(12,2) instead of Float?
## A: Financial data must be exact. Float would introduce rounding errors that accumulate over transactions.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial ORM models for User, Category, Transaction.]
## @modulemap
## CLASS 10[User account — id, name, password_hash] => User
## CLASS 9[Category dictionary — id, name, type, icon, color] => Category
## CLASS 10[Transaction journal — amount, type, FK category+user] => Transaction
## ENUM 8[Transaction direction: INCOME or EXPENSE] => TransactionTypeEnum
## @usecases
## - [User]: AuthRouter → create/query User → persist to users table
## - [Category]: CategoryRouter → seed/query Category → reference data
## - [Transaction]: TransactionRouter → insert Transaction → enforce type‑category consistency
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: ORM, models, User, Category, Transaction, DECIMAL, Enum, ForeignKey, SQLAlchemy, user_id, amount, created_at, password_hash
# STRUCTURE: ▶ ⚡ Enum(INCOME|EXPENSE) → ◇ User⟦id PK, name UNIQUE, password_hash⟧ → ◇ Category⟦id PK, name, type ENUM, icon, color⟧ → ◇ Transaction⟦id PK, amount DECIMAL(12,2), type ENUM, FK→Category, FK→User, created_at, note⟧

import logging
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Text, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

logger = logging.getLogger(__name__)


class TransactionTypeEnum(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


# region CLASS_User [DOMAIN(8): FinanceTracker; CONCEPT(7): Authentication; TECH(9): SQLAlchemyModel]
## @purpose Represent a registered wallet user with a unique login name and bcrypt‑hashed password.
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="user")
# endregion CLASS_User


# region CLASS_Category [DOMAIN(8): FinanceTracker; CONCEPT(7): ReferenceData; TECH(9): SQLAlchemyModel]
## @purpose Store the dictionary of expense/income categories with visual attributes (icon, color) for UI rendering.
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[TransactionTypeEnum] = mapped_column(SAEnum(TransactionTypeEnum), nullable=False)
    icon: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#000000")

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="category")
# endregion CLASS_Category


# region CLASS_Transaction [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalEntry; TECH(9): SQLAlchemyModel, DECIMAL]
## @purpose Record every financial operation — amount, direction, category reference, timestamp, and optional note — forming the immutable audit trail.
class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    type: Mapped[TransactionTypeEnum] = mapped_column(SAEnum(TransactionTypeEnum), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped["Category"] = relationship("Category", back_populates="transactions")
    user: Mapped["User"] = relationship("User", back_populates="transactions")
# endregion CLASS_Transaction
