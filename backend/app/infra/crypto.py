"""Application-level field encryption (Fernet: AES-128-CBC + HMAC). Used for conversation text and extraction payloads.

Interim design: ONE data key from config (supports rotation via a comma-separated list; first key encrypts, all decrypt).
Per-user envelope keys with KMS (crypto-shredding on erasure) are planned for MVP 6 -- see KNOWN_ISSUES.
"""

import json
from functools import lru_cache
from typing import Any

from cryptography.fernet import Fernet, MultiFernet
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

_keys: list[str] = []


def configure_encryption(keys_csv: str) -> None:
    """Called once at startup/test setup with DATA_ENCRYPTION_KEY."""
    global _keys
    _keys = [k.strip() for k in keys_csv.split(",") if k.strip()]
    _fernet.cache_clear()


@lru_cache
def _fernet() -> MultiFernet:
    if not _keys:
        raise RuntimeError("DATA_ENCRYPTION_KEY is not configured")
    return MultiFernet([Fernet(k.encode()) for k in _keys])


def encrypt_text(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


def generate_key() -> str:
    return Fernet.generate_key().decode()


class EncryptedText(TypeDecorator[str]):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect: Any) -> str | None:
        return None if value is None else encrypt_text(value)

    def process_result_value(self, value: str | None, dialect: Any) -> str | None:
        return None if value is None else decrypt_text(value)


class EncryptedJSON(TypeDecorator[Any]):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        return None if value is None else encrypt_text(json.dumps(value))

    def process_result_value(self, value: str | None, dialect: Any) -> Any:
        return None if value is None else json.loads(decrypt_text(value))
