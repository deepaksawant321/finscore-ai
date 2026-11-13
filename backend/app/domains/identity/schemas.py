import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _password(v: str) -> str:
    if len(v) < 10:
        raise ValueError("Password must be at least 10 characters")
    if len(v) > 128:
        raise ValueError("Password must be at most 128 characters")
    if v.lower() == v or v.upper() == v or not any(c.isdigit() for c in v):
        raise ValueError("Password needs upper and lower case letters and a digit")
    return v


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = Field(default=None, max_length=120)
    _pw = field_validator("password")(_password)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int


class VerifyEmailIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str
    _pw = field_validator("new_password")(_password)


class StatusOut(BaseModel):
    status: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str | None
    email_verified: bool
    locale: str
    timezone: str
    roles: list[str] = []


class UserPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    locale: str | None = Field(default=None, max_length=10)
    timezone: str | None = Field(default=None, max_length=50)


class SessionOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    user_agent: str | None
    ip: str | None
    current: bool


class ConsentIn(BaseModel):
    purpose: str
    text_version: str = Field(max_length=30)
    scope: str | None = Field(default=None, max_length=500)


class ConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    purpose: str
    text_version: str
    scope: str | None
    granted_at: datetime
    revoked_at: datetime | None
