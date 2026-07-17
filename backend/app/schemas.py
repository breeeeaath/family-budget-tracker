# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, DTO; CONCEPT(7): DataTransfer, Validation; TECH(9): PydanticV2, Decimal]
## @modulecontract
## @purpose Declare Pydantic v2 DTOs (schemas) that form the contract between frontend and backend. Every request body, response shape, and enum literal is validated here, producing OpenAPI specs consumed by the React client.
## @scope Transaction types, category CRUD shapes, transaction I/O, analytics aggregates, auth tokens.
## @input Python type annotations (no external I/O).
## @output Pydantic model classes used as FastAPI response_model / Body params.
## @links [USED_BY(9): backend.app.routers.*]
## @invariants
## - All monetary fields use Decimal with gt=0 constraint.
## - TransactionType enum has exactly INCOME and EXPENSE members.
## @rationale
## Q: Why separate schemas from ORM models?
## A: Decouples API contract from storage representation. Changing a column does not silently break frontend expectations.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial DTO schemas for auth and data contracts.]
## @modulemap
## ENUM 8[INCOME | EXPENSE] => TransactionType
## CLASS 8[Category response] => CategoryOut
## CLASS 8[Category creation] => CategoryCreate
## CLASS 8[Transaction creation] => TransactionCreate
## CLASS 8[Transaction response] => TransactionOut
## CLASS 8[Dashboard summary] => DashboardSummaryOut
## CLASS 8[Category statistics] => CategoryStatOut
## CLASS 9[Auth token response] => TokenResponse
## CLASS 9[Login credentials] => LoginRequest
## CLASS 9[Registration credentials] => RegisterRequest
## @usecases
## - [TransactionCreate]: Frontend → POST /transactions body → validated Decimal + type → router handler
## - [TokenResponse]: AuthRouter → set HttpOnly cookie + return JSON → frontend stores user context
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: schemas, DTO, Pydantic, TransactionType, CategoryOut, CategoryCreate, TransactionCreate, TransactionOut, DashboardSummaryOut, CategoryStatOut, TokenResponse, LoginRequest, RegisterRequest, Decimal, validation
# STRUCTURE: ▶ ⚡ ENUM(INCOME,EXPENSE) → ◇ CategoryOut/Create → ◇ TransactionCreate/Out → ◇ DashboardSummaryOut → ◇ CategoryStatOut → ◇ TokenResponse → ◇ LoginRequest/RegisterRequest

import logging
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


# region CLASS_CategoryOut [DOMAIN(7): FinanceTracker; CONCEPT(7): ReferenceData; TECH(8): PydanticDTO]
## @purpose Shape of a category record sent to the client.
class CategoryOut(BaseModel):
    id: int
    name: str
    type: TransactionType
    icon: str
    color: str

    model_config = ConfigDict(from_attributes=True)
# endregion CLASS_CategoryOut


# region CLASS_CategoryCreate [DOMAIN(7): FinanceTracker; CONCEPT(7): ReferenceData; TECH(8): PydanticDTO]
## @purpose Shape for creating a new category.
class CategoryCreate(BaseModel):
    name: str
    type: TransactionType
    icon: str
    color: str
# endregion CLASS_CategoryCreate


# region CLASS_TransactionCreate [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalEntry; TECH(8): PydanticDTO]
## @purpose Shape for creating a new transaction — enforces amount > 0 and valid type.
class TransactionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    type: TransactionType
    category_id: int
    note: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
# endregion CLASS_TransactionCreate


# region CLASS_TransactionOut [DOMAIN(8): FinanceTracker; CONCEPT(7): JournalEntry; TECH(8): PydanticDTO]
## @purpose Shape of a transaction as returned to the client — includes server‑assigned id and user_id.
class TransactionOut(TransactionCreate):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
# endregion CLASS_TransactionOut


# region CLASS_DashboardSummaryOut [DOMAIN(8): FinanceTracker; CONCEPT(7): Analytics; TECH(8): PydanticDTO]
## @purpose Aggregate summary for the dashboard — balance, today's spending, monthly totals.
class DashboardSummaryOut(BaseModel):
    total_balance: Decimal
    expense_today: Decimal
    expense_this_month: Decimal
    income_this_month: Decimal

    model_config = ConfigDict(from_attributes=True)
# endregion CLASS_DashboardSummaryOut


# region CLASS_CategoryStatOut [DOMAIN(8): FinanceTracker; CONCEPT(7): Analytics, PieChart; TECH(8): PydanticDTO]
## @purpose Per‑category aggregated spending/income for pie‑chart rendering.
class CategoryStatOut(BaseModel):
    category_id: int
    category_name: str
    total_amount: Decimal
    icon: str
    color: str

    model_config = ConfigDict(from_attributes=True)
# endregion CLASS_CategoryStatOut


# region CLASS_TokenResponse [DOMAIN(8): FinanceTracker; CONCEPT(7): Authentication; TECH(8): PydanticDTO]
## @purpose JWT token payload returned on successful login/register — consumed by frontend for user context.
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
# endregion CLASS_TokenResponse


# region CLASS_LoginRequest [DOMAIN(8): FinanceTracker; CONCEPT(7): Authentication; TECH(8): PydanticDTO]
## @purpose Login form body.
class LoginRequest(BaseModel):
    name: str
    password: str
# endregion CLASS_LoginRequest


# region CLASS_RegisterRequest [DOMAIN(8): FinanceTracker; CONCEPT(7): Authentication; TECH(8): PydanticDTO]
## @purpose Registration form body.
class RegisterRequest(BaseModel):
    name: str
    password: str
# endregion CLASS_RegisterRequest
