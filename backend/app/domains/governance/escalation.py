import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.governance.models import Escalation
from app.domains.governance.service import audit
from app.infra.errors import AppError

REASONS = ("user_request", "regulated_question", "low_confidence", "distress", "other")
STATUSES = ("open", "assigned", "resolved", "closed")
STAFF_ROLES = ("support", "compliance", "admin")
# PLACEHOLDER (human escalation policy is PENDING, D-B10): response-time target from creation.
SLA_HOURS = {"distress": 4}
DEFAULT_SLA_HOURS = 48
MAX_OPEN_PER_USER = 10  # abuse guard


def _now() -> datetime:
    return datetime.now(UTC)


async def create_escalation(
    session: AsyncSession, user_id: uuid.UUID, reason: str, note: str | None, conversation_id: uuid.UUID | None,
    request_id: str | None = None,
) -> Escalation:  # fmt: skip
    if reason not in REASONS:
        raise AppError(422, "validation_error", "Unknown escalation reason", f"Allowed: {list(REASONS)}")
    open_q = select(Escalation).where(Escalation.user_id == user_id, Escalation.status.in_(("open", "assigned")))
    if len((await session.execute(open_q)).scalars().all()) >= MAX_OPEN_PER_USER:
        raise AppError(429, "rate_limited", "Too many open requests", "Please wait for the existing ones to be handled.")
    e = Escalation(
        id=uuid.uuid4(), user_id=user_id, conversation_id=conversation_id, reason=reason, note=note, status="open",
        sla_due_at=_now() + timedelta(hours=SLA_HOURS.get(reason, DEFAULT_SLA_HOURS)),
    )  # fmt: skip
    session.add(e)
    await session.flush()
    await audit(session, action="escalation.created", entity_type="escalation", entity_id=str(e.id), actor_user_id=user_id,
                request_id=request_id, meta={"reason": reason})  # fmt: skip
    return e


async def list_own(session: AsyncSession, user_id: uuid.UUID) -> list[Escalation]:
    q = select(Escalation).where(Escalation.user_id == user_id).order_by(Escalation.created_at.desc())
    return list((await session.execute(q)).scalars().all())


async def get_own(session: AsyncSession, user_id: uuid.UUID, esc_id: uuid.UUID) -> Escalation:
    e = await session.get(Escalation, esc_id)
    if e is None or e.user_id != user_id:  # never reveal other users' requests
        raise AppError(404, "not_found", "Request not found")
    return e


async def staff_queue(session: AsyncSession, status: str | None) -> list[Escalation]:
    q = select(Escalation).order_by(Escalation.sla_due_at)
    if status:
        q = q.where(Escalation.status == status)
    return list((await session.execute(q.limit(200))).scalars().all())


async def staff_update(
    session: AsyncSession, staff_id: uuid.UUID, esc_id: uuid.UUID, status: str | None, assign_to_me: bool,
    resolution_note: str | None, request_id: str | None = None,
) -> Escalation:  # fmt: skip
    e = await session.get(Escalation, esc_id)
    if e is None:
        raise AppError(404, "not_found", "Request not found")
    if status is not None and status not in STATUSES:
        raise AppError(422, "validation_error", "Unknown status")
    if assign_to_me:
        e.assigned_to = staff_id
        if e.status == "open" and status is None:
            e.status = "assigned"
    if status is not None:
        e.status = status
        if status in ("resolved", "closed"):
            e.resolved_at = _now()
    if resolution_note is not None:
        e.resolution_note = resolution_note
    await audit(session, action="escalation.staff_updated", entity_type="escalation", entity_id=str(e.id), actor_user_id=staff_id,
                request_id=request_id, meta={"status": e.status})  # fmt: skip
    return e


async def audit_staff_view(session: AsyncSession, staff_id: uuid.UUID, esc_id: uuid.UUID, request_id: str | None) -> None:
    """Staff can read the user's note: that access is itself audited (security architecture: staff access is purpose-bound and logged)."""
    await audit(session, action="escalation.staff_viewed", entity_type="escalation", entity_id=str(esc_id), actor_user_id=staff_id,
                request_id=request_id)  # fmt: skip
