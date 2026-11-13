import time
import uuid

import jwt
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.domains.governance.service import GENESIS, compute_hash
from app.domains.identity.schemas import RegisterIn
from app.infra.logging import _scrub
from app.infra.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    new_opaque_token,
    verify_password,
)

SECRET = "s" * 40


def test_password_hash_is_argon2id_and_verifies() -> None:
    h = hash_password("Correct-Horse-9")
    assert h.startswith("$argon2id$")
    assert verify_password("Correct-Horse-9", h)
    assert not verify_password("wrong", h)


def test_verify_password_unknown_user_is_false() -> None:
    assert verify_password("anything", None) is False


def test_access_token_roundtrip_and_claims() -> None:
    uid, sid = uuid.uuid4(), uuid.uuid4()
    t = create_access_token(secret=SECRET, issuer="i", user_id=uid, session_id=sid, roles=["user"], ttl_minutes=5)
    c = decode_access_token(t, secret=SECRET, issuer="i")
    assert c["sub"] == str(uid) and c["sid"] == str(sid) and c["roles"] == ["user"]


def test_access_token_rejects_tamper_wrong_issuer_expired_and_alg_none() -> None:
    uid, sid = uuid.uuid4(), uuid.uuid4()
    t = create_access_token(secret=SECRET, issuer="i", user_id=uid, session_id=sid, roles=[], ttl_minutes=5)
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(t, secret="x" * 40, issuer="i")
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(t, secret=SECRET, issuer="other")
    expired = create_access_token(secret=SECRET, issuer="i", user_id=uid, session_id=sid, roles=[], ttl_minutes=-1)
    time.sleep(0.01)
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(expired, secret=SECRET, issuer="i")
    none_tok = jwt.encode({"sub": str(uid), "iss": "i", "exp": 9999999999}, key="", algorithm="none")
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(none_tok, secret=SECRET, issuer="i")


def test_opaque_tokens_are_unique_and_hash_is_stable() -> None:
    a, b = new_opaque_token(), new_opaque_token()
    assert a != b and len(a) >= 60
    assert hash_token(a) == hash_token(a) != hash_token(b)


@pytest.mark.parametrize("pw", ["short1A", "alllowercase123", "ALLUPPERCASE123", "NoDigitsHereAtAll"])
def test_weak_passwords_rejected(pw: str) -> None:
    with pytest.raises(ValidationError):
        RegisterIn(email="a@example.com", password=pw)


def test_strong_password_accepted() -> None:
    assert RegisterIn(email="a@example.com", password="Str0ngPassw0rd!").email == "a@example.com"


def test_production_settings_guards() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, env="production", database_url="x", jwt_secret="short", cookie_secure=True)  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        Settings(_env_file=None, env="production", database_url="x", jwt_secret="s" * 40, cookie_secure=False)  # type: ignore[arg-type]
    Settings(_env_file=None, env="production", database_url="x", jwt_secret="s" * 40, cookie_secure=True)  # type: ignore[arg-type]


def test_audit_hash_chain_is_deterministic_and_order_sensitive() -> None:
    row = {"a": 1, "b": "x"}
    h1 = compute_hash(GENESIS, row)
    assert h1 == compute_hash(GENESIS, {"b": "x", "a": 1})
    assert compute_hash(h1, row) != h1
    assert compute_hash(GENESIS, {"a": 2, "b": "x"}) != h1


def test_log_scrubber_redacts_secrets_and_emails() -> None:
    out = _scrub(None, "info", {"password": "p", "msg": "mail bob@example.com now", "ok": 1})
    assert out["password"] == "[REDACTED]" and "bob@example.com" not in str(out["msg"]) and out["ok"] == 1
