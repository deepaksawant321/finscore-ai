from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["local", "test", "staging", "production"] = "local"
    database_url: str = Field(..., description="postgresql+asyncpg://...")
    jwt_secret: SecretStr = Field(...)  # no default: must be supplied
    jwt_issuer: str = "finscore-ai"
    access_ttl_minutes: int = 15
    refresh_ttl_days: int = 14
    email_token_ttl_minutes: int = 60
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]
    frontend_url: str = "http://localhost:3000"
    rate_limit_enabled: bool = True
    max_failed_logins: int = 5
    lockout_minutes: int = 15
    smtp_host: str | None = None
    smtp_port: int = 1025
    data_encryption_key: SecretStr = Field(...)  # Fernet key(s), comma-separated; first encrypts
    ai_provider: Literal["none", "anthropic"] = "none"
    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-haiku-5-5"
    erasure_cooling_days: int = 7  # PLACEHOLDER: retention/legal-hold rules PENDING (D-B16)
    mail_dir: str | None = None  # local dev only (never in staging/production)
    mail_from: str = "no-reply@5nance.local"
    # In-process erasure purge scheduler (K-25). Interim, single-process solution: no new infra/recurring cost.
    # Safe to enable on more than one instance — purge_due only touches rows still pending and due.
    purge_scheduler_enabled: bool = True
    purge_interval_seconds: int = Field(default=3600, ge=60)  # PLACEHOLDER cadence; not an approved operational SLA
    # Wealth OS in-process event dispatcher (AC-20). Same interim-solution reasoning as the purge scheduler above:
    # an outbox table + in-process poller, no broker, no recurring cost. See app/domains/events/.
    wealth_os_enabled: bool = True
    wealth_os_interval_seconds: int = Field(default=15, ge=1)  # PLACEHOLDER cadence
    wealth_os_max_attempts: int = Field(default=5, ge=1)  # PLACEHOLDER: an event this often-failing is given up on, not lost

    @model_validator(mode="after")
    def _prod_guards(self) -> "Settings":
        if self.env in ("staging", "production"):
            if len(self.jwt_secret.get_secret_value()) < 32:
                raise ValueError("JWT_SECRET must be >= 32 chars in staging/production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in staging/production")
            if self.ai_provider == "anthropic" and not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY required when AI_PROVIDER=anthropic")
            if self.mail_dir:
                raise ValueError("MAIL_DIR is for local development only")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
