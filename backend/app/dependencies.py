# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, Middleware; CONCEPT(7): DependencyInjection; TECH(9): FastAPIDepends, JWT]
## @modulecontract
## @purpose Supply reusable FastAPI dependency callables for database sessions and authenticated user resolution. These are the building blocks injected into every protected route via Depends().
## @scope DB session lifecycle, cookie‑based JWT extraction, user identity resolution.
## @input Request cookies (access_token), SQLAlchemy async session.
## @output AsyncSession (per‑request), int (user_id).
## @links [DEPENDS_ON(9): backend.app.database.get_db, backend.app.auth.decode_access_token]
## @invariants
## - get_current_user raises HTTP 401 for missing, expired, or malformed tokens.
## - get_db always yields a valid session.
## @rationale
## Q: Why extract from cookies instead of Authorization header?
## A: HttpOnly cookies are immune to XSS and are automatically sent by browsers with withCredentials, simplifying the frontend.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial dependencies module.]
## @modulemap
## FUNC 10[Yield async DB session] => get_db
## FUNC 10[Extract user_id from JWT cookie] => get_current_user
## @usecases
## - [get_current_user]: ProtectedRouter → Depends(get_current_user) → cookie decode → user_id → route logic
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: dependencies, Depends, get_db, get_current_user, JWT cookie, authentication, FastAPI, user_id, Request
# STRUCTURE: ▶ ○ get_db() → ⚡ async_session_maker → yield session; ▶ ○ get_current_user → ⚡ Request.cookies[access_token] → ◇ decode_access_token → int(user_id) | HTTPException 401

import logging

from fastapi import Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from backend.app.database import async_session_maker
from backend.app.auth import decode_access_token

logger = logging.getLogger(__name__)


# region FUNC_get_db [DOMAIN(7): DataPersistence; CONCEPT(8): DependencyInjection; TECH(9): AsyncSession]
## @purpose Yield an async SQLAlchemy session scoped to a single request handler.
## @uses async_session_maker
## @io None -> AsyncGenerator[AsyncSession]
## @complexity 2
async def get_db():
    async with async_session_maker() as session:
        logger.debug(f"[IMP:5][get_db][SESSION] Async session yielded for dependency injection.")
        yield session
# endregion FUNC_get_db


# region FUNC_get_current_user [DOMAIN(8): Security; CONCEPT(7): Authentication; TECH(9): FastAPIRequest, JWT]
## @purpose Read the access_token from the HttpOnly cookie, decode it, and return the authenticated user_id. Raises 401 for any auth failure.
## @uses decode_access_token, Request.cookies
## @io Request, AsyncSession -> int
## @complexity 4
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> int:
    token = request.cookies.get("access_token")
    if token is None:
        logger.warning(f"[IMP:8][get_current_user][NO_TOKEN] No access_token cookie in request. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=401, detail="Not authenticated: missing token")

    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if user_id_str is None:
            logger.warning(f"[IMP:8][get_current_user][NO_SUB] Token payload missing 'sub' claim. [SECURITY_BOUNDARY]")
            raise HTTPException(status_code=401, detail="Invalid token: no subject claim")
        user_id = int(user_id_str)
        logger.info(f"[IMP:9][get_current_user][AUTH_OK] Authenticated user_id={user_id}. [BUSINESS_ACTION]")
        return user_id
    except JWTError as e:
        logger.warning(f"[IMP:8][get_current_user][JWT_ERROR] Token decode failed: {e}. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except ValueError:
        logger.warning(f"[IMP:8][get_current_user][VALUE_ERROR] sub claim is not a valid int. [SECURITY_BOUNDARY]")
        raise HTTPException(status_code=401, detail="Invalid token payload")
# endregion FUNC_get_current_user
