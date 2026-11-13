import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()  # argon2id defaults
_DUMMY_HASH = _hasher.hash("dummy-password-for-constant-time")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Runs a verification against a dummy hash when the user does not exist (timing equalisation)."""
    try:
        ok = _hasher.verify(password_hash or _DUMMY_HASH, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return ok and password_hash is not None


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    *, secret: str, issuer: str, user_id: uuid.UUID, session_id: uuid.UUID, roles: list[str], ttl_minutes: int
) -> str:
    now = datetime.now(UTC)
    payload = {
        "iss": issuer,
        "sub": str(user_id),
        "sid": str(session_id),
        "roles": roles,
        "iat": now,
        "exp": now + timedelta(minutes=ttl_minutes),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str, *, secret: str, issuer: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=["HS256"], issuer=issuer, options={"require": ["exp", "sub", "iss"]})
