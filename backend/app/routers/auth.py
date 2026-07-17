# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, API; CONCEPT(7): Authentication, Session; TECH(9): FastAPIRouter, HttpOnlyCookie]
## @modulecontract
## @purpose Expose authentication endpoints (register, login) that create user accounts, verify credentials, issue JWT tokens, and set HttpOnly cookies — the sole entry points for session creation.
## @scope POST /auth/register, POST /auth/login.
## @input RegisterRequest (name + password), LoginRequest (name + password).
## @output TokenResponse JSON + Set-Cookie header with HttpOnly JWT.
## @links [DEPENDS_ON(9): backend.app.auth.hash_password, verify_password, create_access_token; backend.app.models.User; backend.app.schemas.TokenResponse]
## @invariants
## - Register enforces unique username (409 conflict on duplicate).
## - Login returns 401 for wrong password.
## - Cookie is always HttpOnly, Secure, SameSite=lax, max_age=30 days.
## @rationale
## Q: Why return TokenResponse JSON AND set cookie?
## A: Cookie enables silent browser auth; JSON body gives frontend immediate user_id and name without decoding the JWT.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial auth router.]
## @modulemap
## ENDPOINT 10[Create account + issue token] => POST /auth/register
## ENDPOINT 10[Verify credentials + issue token] => POST /auth/login
## @usecases
## - [register]: NewUser → POST /auth/register → User created + JWT cookie set → Dashboard
## - [login]: ReturningUser → POST /auth/login → Password verified + JWT cookie set → Dashboard
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: router, auth, register, login, JWT, HttpOnly cookie, FastAPI, APIRouter, TokenResponse, password hash, bcrypt
# STRUCTURE: ▶ POST /auth/register → ◇ RegisterRequest → hash_password → ◇ User insert → ⚡ create_access_token → ◇ SetCookie(access_token) → ⟦TokenResponse⟧; ▶ POST /auth/login → ◇ LoginRequest → ○ find User → ◇ verify_password → T/F → ⚡ create_access_token → ◇ SetCookie → ⟦TokenResponse⟧

import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.dependencies import get_db, get_current_user
from backend.app.models import User
from backend.app.schemas import TokenResponse, LoginRequest, RegisterRequest
from backend.app.auth import hash_password, verify_password, create_access_token
from backend.app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE = 86400 * 30


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
    )


# region ENDPOINT_register [DOMAIN(8): FinanceTracker; CONCEPT(7): UserRegistration; TECH(9): FastAPI, bcrypt, JWT]
## @purpose Create a new user account, hash the password, persist the record, issue a JWT, set the HttpOnly cookie, and return user context.
## @uses hash_password, create_access_token, User ORM
## @io RegisterRequest -> TokenResponse
## @complexity 5
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info(f"[IMP:9][register][ATTEMPT] Registration attempt for name='{body.name}'. [BUSINESS_ACTION]")

    existing = await db.execute(select(User).where(User.name == body.name))
    if existing.scalar_one_or_none() is not None:
        logger.warning(f"[IMP:8][register][CONFLICT] Username '{body.name}' already taken. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=409, detail="Username already exists")

    password_hash = hash_password(body.password)
    user = User(name=body.name, password_hash=password_hash)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    _set_auth_cookie(response, token)

    logger.info(f"[IMP:9][register][SUCCESS] User id={user.id} name='{user.name}' registered. [BUSINESS_ACTION]")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
    )
# endregion ENDPOINT_register


# region ENDPOINT_login [DOMAIN(8): FinanceTracker; CONCEPT(7): UserLogin; TECH(9): FastAPI, bcrypt, JWT]
## @purpose Authenticate a user by name/password, issue a JWT, set the HttpOnly cookie, and return user context. Returns 401 on bad credentials.
## @uses verify_password, create_access_token, User ORM
## @io LoginRequest -> TokenResponse
## @complexity 4
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info(f"[IMP:9][login][ATTEMPT] Login attempt for name='{body.name}'. [BUSINESS_ACTION]")

    result = await db.execute(select(User).where(User.name == body.name))
    user = result.scalar_one_or_none()

    if user is None:
        logger.warning(f"[IMP:8][login][NOT_FOUND] User '{body.name}' not found. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, user.password_hash):
        logger.warning(f"[IMP:8][login][BAD_PASSWORD] Invalid password for '{body.name}'. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": str(user.id)})
    _set_auth_cookie(response, token)

    logger.info(f"[IMP:9][login][SUCCESS] User id={user.id} name='{user.name}' logged in. [BUSINESS_ACTION]")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
    )
# endregion ENDPOINT_login


# region ENDPOINT_me [DOMAIN(8): FinanceTracker; CONCEPT(7): Identity; TECH(9): FastAPI, JWT]
## @purpose Return the authenticated user's id — minimal identity probe for testing auth guard.
## @uses get_current_user
## @io Cookie(token) -> dict
## @complexity 2
@router.get("/me")
async def me(user_id: int = Depends(get_current_user)):
    logger.info(f"[IMP:9][me][IDENTITY] Authenticated user_id={user_id}. [BUSINESS_ACTION]")
    return {"user_id": user_id}
# endregion ENDPOINT_me
