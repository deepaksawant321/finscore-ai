import hashlib
import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.governance.models import AuditLog, Consent
from app.infra.errors import AppError

GENESIS = "0" * 64
CONSENT_PURPOSES = {"core_processing", "ai_processing", "connected_data", "marketing", "analytics"}
_LOCK_KEY = 727001


def compute_hash(prev_hash: str, row: dict[str, object]) -> str:
    payload = json.dumps(row, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256((prev_hash + payload).encode()).hexdigest()


def _row_payload(r: AuditLog) -> dict[str, object]:
    return {
        "id": str(r.id),
        "occurred_at": r.occurred_at.astimezone(UTC).isoformat(),
        "actor": str(r.actor_user_id) if r.actor_user_id else None,
        "action": r.action,
        "entity_type": r.entity_type,
        "entity_id": r.entity_id,
        "meta": r.meta,
    }


async def audit(
    session: AsyncSession,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_user_id: uuid.UUID | None = None,
    ip: str | None = None,
    request_id: str | None = None,
    meta: dict[str, object] | None = None,
) -> AuditLog:
    """Append an audit record, extending the hash chain. Never put secrets/PII values in `meta`."""
    await session.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": _LOCK_KEY})
    prev = (await session.execute(select(AuditLog.hash).order_by(AuditLog.seq.desc()).limit(1))).scalar()
    row = AuditLog(
        id=uuid.uuid4(),
        occurred_at=datetime.now(UTC).replace(microsecond=0),
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip=ip,
        request_id=request_id,
        meta=meta or {},
        prev_hash=prev or GENESIS,
        hash="",
    )
    row.hash = compute_hash(row.prev_hash, _row_payload(row))
    session.add(row)
    await session.flush()
    return row


async def verify_chain(session: AsyncSession) -> bool:
    rows = (await session.execute(select(AuditLog).order_by(AuditLog.seq))).scalars().all()
    prev = GENESIS
    for r in rows:
        if r.prev_hash != prev or r.hash != compute_hash(prev, _row_payload(r)):
            return False
        prev = r.hash
    return True


async def grant_consent(session: AsyncSession, user_id: uuid.UUID, purpose: str, text_version: str, scope: str | None) -> Consent:
    if purpose not in CONSENT_PURPOSES:
        raise AppError(422, "validation_error", "Unknown consent purpose", f"Allowed: {sorted(CONSENT_PURPOSES)}")
    existing = await active_consent(session, user_id, purpose)
    if existing:
        return existing
    c = Consent(user_id=user_id, purpose=purpose, text_version=text_version, scope=scope, granted_at=datetime.now(UTC))
    session.add(c)
    await session.flush()
    await audit(
        session,
        action="consent.granted",
        entity_type="consent",
        entity_id=str(c.id),
        actor_user_id=user_id,
        meta={"purpose": purpose, "text_version": text_version},
    )
    return c


async def active_consent(session: AsyncSession, user_id: uuid.UUID, purpose: str) -> Consent | None:
    q = select(Consent).where(Consent.user_id == user_id, Consent.purpose == purpose, Consent.revoked_at.is_(None))
    return (await session.execute(q)).scalars().first()


async def list_consents(session: AsyncSession, user_id: uuid.UUID) -> list[Consent]:
    q = select(Consent).where(Consent.user_id == user_id).order_by(Consent.granted_at)
    return list((await session.execute(q)).scalars().all())


async def revoke_consent(session: AsyncSession, user_id: uuid.UUID, purpose: str) -> None:
    c = await active_consent(session, user_id, purpose)
    if not c:
        raise AppError(404, "not_found", "No active consent for this purpose")
    c.revoked_at = datetime.now(UTC)
    await audit(
        session,
        action="consent.revoked",
        entity_type="consent",
        entity_id=str(c.id),
        actor_user_id=user_id,
        meta={"purpose": purpose},
    )
