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
    mail_dir: str | None = None  # local dev only (never in staging/production)
    mail_from: str = "no-reply@5nance.local"

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
