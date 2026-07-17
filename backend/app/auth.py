# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, Security; CONCEPT(7): Authentication, JWT; TECH(9): bcrypt, python-jose, HS256]
## @modulecontract
## @purpose Encapsulate password hashing/verification and JWT lifecycle so every auth‑related decision (hash strength, token duration, algorithm) is centralised and auditable.
## @scope bcrypt password utilities, JWT create + decode, token expiry.
## @input Plain passwords (str), user data dicts.
## @output Hashed passwords (str), signed JWT strings, decoded payload dicts.
## @links [READS_DATA_FROM(9): config.settings.SECRET_KEY, config.settings.JWT_ALGORITHM, config.settings.ACCESS_TOKEN_EXPIRE_DAYS]
## @invariants
## - hash_password never returns the plain input.
## - verify_password is constant‑time (bcrypt guarantees this).
## - create_access_token embeds sub claim as string.
## - decode_access_token raises JWTError on any invalid token.
## @rationale
## Q: Why HS256 (symmetric) instead of RS256 (asymmetric)?
## A: Single‑service deployment — no need for public/private key distribution. HS256 + strong SECRET_KEY is sufficient.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial auth utility module.]
## @modulemap
## FUNC 10[bcrypt hash password] => hash_password
## FUNC 10[bcrypt verify password] => verify_password
## FUNC 10[JWT encode with 30d expiry] => create_access_token
## FUNC 10[JWT decode + validate] => decode_access_token
## @usecases
## - [hash_password]: RegisterRouter → plain password → bcrypt hash → store in users.password_hash
## - [decode_access_token]: AuthMiddleware → HttpOnly cookie → JWT decode → user_id → injected into request
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: auth, bcrypt, JWT, HS256, hash_password, verify_password, create_access_token, decode_access_token, passlib, python-jose, token
# STRUCTURE: ▶ ⚡ plain_pw → ◇ hash_password → bcrypt ⟦$2b$...⟧ → ○ verify_password ◇ hash vs plain → bool → ⚡ user_data → ◇ create_access_token → JWT⟦sub=user_id, exp=+30d, HS256⟧ → ◇ decode_access_token → ⟅sub: str⟆ | JWTError

import logging
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError

from backend.app.config import settings

logger = logging.getLogger(__name__)


# region FUNC_hash_password [DOMAIN(8): Security; CONCEPT(7): PasswordHashing; TECH(9): bcrypt]
## @purpose Transform a plain‑text password into an irreversible bcrypt hash for safe persistence.
## @uses bcrypt
## @io str -> str
## @complexity 2
def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    logger.info(f"[IMP:9][hash_password][HASH] Password hashed with bcrypt. [BUSINESS_ACTION]")
    return hashed
# endregion FUNC_hash_password


# region FUNC_verify_password [DOMAIN(8): Security; CONCEPT(7): PasswordVerification; TECH(9): bcrypt]
## @purpose Compare a plain‑text password against a stored bcrypt hash — returns True only on match.
## @uses bcrypt
## @io str, str -> bool
## @complexity 2
def verify_password(plain: str, hashed: str) -> bool:
    result = bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    logger.info(f"[IMP:9][verify_password][VERIFY] Password verification: {'success' if result else 'failure'}. [BUSINESS_ACTION]")
    return result
# endregion FUNC_verify_password


# region FUNC_create_access_token [DOMAIN(8): Security; CONCEPT(7): JWTIssuance; TECH(9): HS256, python-jose]
## @purpose Issue a signed JWT with user_id as the sub claim and a 30‑day expiration window.
## @uses jose.jwt.encode, config.settings
## @io dict -> str
## @complexity 3
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    logger.info(f"[IMP:9][create_access_token][TOKEN_ISSUED] JWT issued for sub={data.get('sub')}, expires at {expire.isoformat()}. [BUSINESS_ACTION]")
    return token
# endregion FUNC_create_access_token


# region FUNC_decode_access_token [DOMAIN(8): Security; CONCEPT(7): JWTValidation; TECH(9): HS256, python-jose]
## @purpose Decode and cryptographically validate a JWT, returning its payload. Raises JWTError on any integrity or expiry failure.
## @uses jose.jwt.decode, config.settings
## @io str -> dict
## @complexity 3
def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        logger.debug(f"[IMP:5][decode_access_token][DECODE_OK] Token payload: sub={payload.get('sub')}.")
        return payload
    except JWTError as e:
        logger.warning(f"[IMP:8][decode_access_token][DECODE_FAIL] JWT validation failed: {e}. [SECURITY_BOUNDARY]")
        raise JWTError(str(e))
# endregion FUNC_decode_access_token
