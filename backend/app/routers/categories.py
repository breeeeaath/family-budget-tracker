# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, API; CONCEPT(7): ReferenceData, CRUD; TECH(9): FastAPIRouter]
## @modulecontract
## @purpose Expose category CRUD endpoints — create (auth‑required), list (public dictionary), and get‑by‑id. Categories form the reference data backbone for transaction classification and analytics grouping.
## @scope POST /api/categories, GET /api/categories, GET /api/categories/{category_id}.
## @input CategoryCreate (body), current_user (cookie for POST), category_id (path).
## @output CategoryOut | List[CategoryOut], 404 for missing category.
## @links [DEPENDS_ON(9): backend.app.dependencies.get_current_user, backend.app.dependencies.get_db; backend.app.models.Category; backend.app.schemas.CategoryCreate, CategoryOut]
## @invariants
## - GET /api/categories always returns list sorted by name ASC.
## - POST /api/categories requires valid JWT cookie; 401 otherwise.
## - GET endpoints are public (no auth required).
## @rationale
## Q: Why is the category list public?
## A: Categories are a shared dictionary — they don't contain user‑specific data. Public access reduces frontend overhead and enables pre‑login UI rendering.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S2: initial categories router with CRUD endpoints.]
## @modulemap
## ENDPOINT 9[Create category (auth)] => POST /api/categories
## ENDPOINT 8[List all categories (public)] => GET /api/categories
## ENDPOINT 8[Get category by id (public)] => GET /api/categories/{category_id}
## @usecases
## - [create]: AuthenticatedUser → POST /api/categories with CategoryCreate → persist → CategoryOut
## - [list]: AnyClient → GET /api/categories → sorted dictionary → populate dropdown
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: categories, router, CRUD, FastAPI, APIRouter, CategoryCreate, CategoryOut, create, list, get_by_id, auth, sorted
# STRUCTURE: ▶ POST /api/categories → ◇ auth(Depends get_current_user) → ⊕ Category insert → ⟦CategoryOut⟧; ▶ GET /api/categories → ◇ select(Category).order_by(name) → ⟦List[CategoryOut]⟧; ▶ GET /api/categories/{id} → ◇ select where id → T/F → 404 | ⟦CategoryOut⟧

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.dependencies import get_db, get_current_user
from backend.app.models import Category
from backend.app.schemas import CategoryCreate, CategoryOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categories", tags=["categories"])


# region ENDPOINT_create_category [DOMAIN(8): FinanceTracker; CONCEPT(7): ReferenceData; TECH(9): FastAPI, SQLAlchemyInsert]
## @purpose Allow an authenticated user to create a new spending/income category with visual attributes (icon, color) for UI rendering.
## @uses get_current_user, get_db, Category ORM
## @io CategoryCreate -> CategoryOut
## @complexity 4
@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    logger.info(f"[IMP:9][create_category][CREATE] Creating category name='{body.name}' type={body.type.value} by user_id={user_id}. [BUSINESS_ACTION]")

    category = Category(
        name=body.name,
        type=body.type.value,
        icon=body.icon,
        color=body.color,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    logger.info(f"[IMP:9][create_category][CREATED] Category id={category.id} name='{category.name}' created. [BUSINESS_ACTION]")
    return CategoryOut.model_validate(category)
# endregion ENDPOINT_create_category


# region ENDPOINT_list_categories [DOMAIN(7): FinanceTracker; CONCEPT(7): ReferenceData; TECH(8): FastAPI, SQLAlchemySelect]
## @purpose Return the full category dictionary sorted alphabetically by name — public endpoint, no auth required.
## @uses get_db, Category ORM
## @io None -> List[CategoryOut]
## @complexity 3
@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    logger.debug(f"[IMP:5][list_categories][QUERY] Fetching all categories sorted by name.")

    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()

    logger.debug(f"[IMP:5][list_categories][RESULT] Returned {len(categories)} categories.")
    return [CategoryOut.model_validate(c) for c in categories]
# endregion ENDPOINT_list_categories


# region ENDPOINT_get_category [DOMAIN(7): FinanceTracker; CONCEPT(7): ReferenceData; TECH(8): FastAPI, SQLAlchemySelect]
## @purpose Return a single category by its primary key — returns 404 if not found. Public endpoint.
## @uses get_db, Category ORM
## @io int -> CategoryOut
## @complexity 3
@router.get("/{category_id}", response_model=CategoryOut)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    logger.debug(f"[IMP:5][get_category][QUERY] Looking up category id={category_id}.")

    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()

    if category is None:
        logger.warning(f"[IMP:8][get_category][NOT_FOUND] Category id={category_id} not found. [BOUNDARY]")
        raise HTTPException(status_code=404, detail="Category not found")

    logger.debug(f"[IMP:5][get_category][FOUND] Category id={category_id} name='{category.name}'.")
    return CategoryOut.model_validate(category)
# endregion ENDPOINT_get_category
