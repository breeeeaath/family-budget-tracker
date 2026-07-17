# region MODULE_CONTRACT [DOMAIN(8): FinanceTracker, Infrastructure; CONCEPT(7): Configuration; TECH(9): PydanticSettings]
## @modulecontract
## @purpose Centralised, type‑safe configuration for the Wallet backend. All environment‑dependent values flow through this single source of truth, eliminating scattered os.getenv() calls and enabling easy overrides in test and CI contexts.
## @scope Database connection, JWT secrets and token lifecycle, environment‑aware defaults.
## @input Environment variables (DATABASE_URL, SECRET_KEY) or .env file.
## @output A singleton Pydantic BaseSettings object consumed by database.py, auth.py, main.py.
## @links [USES_API(8): pydantic_settings.BaseSettings]
## @invariants
## - Settings object is immutable after initial load.
## - DATABASE_URL always resolves to an async dialect.
## @rationale
## Q: Why pydantic_settings.BaseSettings instead of plain os.getenv?
## A: Type validation catches misconfigured environments at import time; .env auto‑loading removes manual dotenv boilerplate.
## @changes
## LAST_CHANGE: [v1.0.0 – Slice S1: initial configuration module for backend core.]
## @modulemap
## CLASS 10[Application settings singleton] => Settings
## @usecases
## - [Settings]: AnyModule → Read typed config value → Consistent environment binding
def _module_contract():
    pass
# endregion MODULE_CONTRACT
# GREP_SUMMARY: Settings, configuration, DATABASE_URL, SECRET_KEY, JWT, pydantic, environment variables, config
# STRUCTURE: ▶ ⚡ class Settings(BaseSettings) → ┌DATABASE_URL (asyncpg) + SECRET_KEY + JWT_ALGORITHM + ACCESS_TOKEN_EXPIRE_DAYS┐ → ⟦settings = Settings()⟧

import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

# region CLASS_Settings [DOMAIN(8): FinanceTracker; CONCEPT(7): Configuration; TECH(9): PydanticSettings]
## @purpose Encapsulate every runtime‑resolved configuration value so all modules consume a single, validated settings instance.
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://wallet:wallet@localhost:5432/wallet"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
# endregion CLASS_Settings

settings = Settings()
logger.info(f"[IMP:7][Settings][INIT] Config loaded. DB={settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
