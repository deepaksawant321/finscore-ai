"""Data-subject rights: export and erasure (blueprint section 22; security architecture section 7).

Retention periods and legal holds are PENDING Legal approval (D-B16). Interim behaviour:
  * export: immediate, complete JSON bundle of the user's own data;
  * erasure: password re-confirmation, a cooling-off period (placeholder), cancellable, then a hard delete that cascades to all
    personal data. Audit-log rows are append-only and hash-chained, so they remain but hold only opaque ids (no PII).
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.goals.models import Goal
from app.domains.governance.models import AuditLog, Consent, DataRequest, Escalation
from app.domains.governance.service import audit
from app.domains.identity.models import User, UserRole
from app.domains.interview.models import Conversation, Message
from app.domains.profile.models import Fact
from app.domains.scoring.models import ScoreRun
from app.domains.simulation.models import Simulation
from app.infra.errors import AppError
from app.infra.security import verify_password


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(d: datetime | None) -> str | None:
    return None if d is None else d.astimezone(UTC).isoformat()


class PrivacyService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings

    async def _all(self, model: Any, where: Any, order: Any) -> list[Any]:
        return list((await self.s.execute(select(model).where(where).order_by(order))).scalars().all())

    async def export_bundle(self, user_id: uuid.UUID, request_id: str | None = None) -> dict[str, Any]:
        user = await self.s.get(User, user_id)
        if user is None:
            raise AppError(404, "not_found", "User not found")
        roles = (await self.s.execute(select(UserRole.role).where(UserRole.user_id == user_id))).scalars().all()
        facts = await self._all(Fact, Fact.user_id == user_id, Fact.valid_from)
        consents = await self._all(Consent, Consent.user_id == user_id, Consent.granted_at)
        convs = await self._all(Conversation, Conversation.user_id == user_id, Conversation.created_at)
        runs = await self._all(ScoreRun, ScoreRun.user_id == user_id, ScoreRun.computed_at)
        goals = await self._all(Goal, Goal.user_id == user_id, Goal.created_at)
        escs = await self._all(Escalation, Escalation.user_id == user_id, Escalation.created_at)
        events = await self._all(AuditLog, AuditLog.actor_user_id == user_id, AuditLog.seq)
        conversations = []
        for c in convs:
            msgs = await self._all(Message, Message.conversation_id == c.id, Message.created_at)
            conversations.append(
                {
                    "id": str(c.id),
                    "mode": c.mode,
                    "intents": c.intents,
                    "started_at": _iso(c.created_at),
                    "messages": [
                        {"role": m.role, "content": m.content, "at": _iso(m.created_at), "advice_class": m.advice_class}
                        for m in msgs
                    ],
                }
            )
        await audit(
            self.s,
            action="privacy.export",
            entity_type="user",
            entity_id=str(user_id),
            actor_user_id=user_id,
            request_id=request_id,
        )
        self.s.add(
            DataRequest(
                id=uuid.uuid4(), user_id=user_id, kind="export", status="completed", requested_at=_now(), completed_at=_now()
            )
        )
        return {
            "generated_at": _iso(_now()),
            "format_version": "1",
            "account": {
                "email": user.email,
                "full_name": user.full_name,
                "locale": user.locale,
                "timezone": user.timezone,
                "email_verified": user.email_verified,
                "roles": sorted(roles),
                "created_at": _iso(user.created_at),
            },  # fmt: skip
            "consents": [
                {
                    "purpose": c.purpose,
                    "text_version": c.text_version,
                    "granted_at": _iso(c.granted_at),
                    "revoked_at": _iso(c.revoked_at),
                }
                for c in consents
            ],
            "financial_facts": [
                {
                    "field": f.field_key,
                    "value": f.value,
                    "source_type": f.source_type,
                    "source_ref": f.source_ref,
                    "verification_state": f.verification_state,
                    "valid_from": _iso(f.valid_from),
                    "valid_to": _iso(f.valid_to),
                }
                for f in facts
            ],  # fmt: skip
            "conversations": conversations,
            "score_history": [
                {
                    "computed_at": _iso(r.computed_at),
                    "overall": str(r.overall),
                    "confidence": str(r.confidence),
                    "stage": r.stage,
                    "stage_provisional": r.stage_provisional,
                    "official": r.official,
                    "rule_set": r.rule_set,
                    "rulebook_version": r.rulebook_version,
                    "pillars": r.pillars,
                    "dna": r.dna,
                    "persona": r.persona,
                }
                for r in runs
            ],  # fmt: skip
            "goals": [
                {
                    "name": g.name,
                    "target_amount_today": str(g.target_amount_today),
                    "target_date": g.target_date.isoformat(),
                    "priority": g.priority,
                    "current_funding": str(g.current_funding),
                    "monthly_funding": str(g.monthly_funding),
                    "status": g.status,
                }
                for g in goals
            ],  # fmt: skip
            "simulations": [
                {
                    "created_at": _iso(x.created_at),
                    "kind": x.kind,
                    "scenario": x.scenario,
                    "result": x.result,
                    "official": x.official,
                }
                for x in await self._all(Simulation, Simulation.user_id == user_id, Simulation.created_at)
            ],
            "support_requests": [
                {
                    "reason": e.reason,
                    "note": e.note,
                    "status": e.status,
                    "created_at": _iso(e.created_at),
                    "resolution_note": e.resolution_note,
                }
                for e in escs
            ],
            "activity_log": [{"at": _iso(e.occurred_at), "action": e.action, "entity_type": e.entity_type} for e in events],
        }

    async def pending_erasure(self, user_id: uuid.UUID) -> DataRequest | None:
        q = select(DataRequest).where(
            DataRequest.user_id == user_id, DataRequest.kind == "erasure", DataRequest.status == "pending"
        )
        return (await self.s.execute(q)).scalars().first()

    async def request_erasure(self, user_id: uuid.UUID, password: str, request_id: str | None = None) -> DataRequest:
        user = await self.s.get(User, user_id)
        if user is None or not verify_password(password, user.password_hash):
            raise AppError(403, "reauth_failed", "Password confirmation failed")
        existing = await self.pending_erasure(user_id)
        if existing:
            return existing
        req = DataRequest(
            id=uuid.uuid4(), user_id=user_id, kind="erasure", status="pending", requested_at=_now(),
            scheduled_for=_now() + timedelta(days=self.cfg.erasure_cooling_days),
        )  # fmt: skip
        self.s.add(req)
        await self.s.flush()
        await audit(
            self.s, action="privacy.erasure_requested", entity_type="user", entity_id=str(user_id), actor_user_id=user_id,
            request_id=request_id, meta={"scheduled_for": _iso(req.scheduled_for)},
        )  # fmt: skip
        return req

    async def cancel_erasure(self, user_id: uuid.UUID, request_id: str | None = None) -> None:
        req = await self.pending_erasure(user_id)
        if req is None:
            raise AppError(404, "not_found", "No pending erasure request")
        req.status = "cancelled"
        await audit(
            self.s,
            action="privacy.erasure_cancelled",
            entity_type="user",
            entity_id=str(user_id),
            actor_user_id=user_id,
            request_id=request_id,
        )

    async def purge_due(self, now: datetime | None = None) -> list[uuid.UUID]:
        """Run by a scheduled job/CLI (scripts/purge_due.py). Hard-deletes users whose cooling-off period has ended."""
        now = now or _now()
        q = select(DataRequest).where(
            DataRequest.kind == "erasure", DataRequest.status == "pending", DataRequest.scheduled_for <= now
        )
        done: list[uuid.UUID] = []
        for req in (await self.s.execute(q)).scalars().all():
            await self.s.execute(delete(User).where(User.id == req.user_id))  # ON DELETE CASCADE removes all personal data
            req.status, req.completed_at = "completed", now
            await audit(self.s, action="privacy.erased", entity_type="user", entity_id=str(req.user_id), actor_user_id=None,
                        meta={"request_id": str(req.id)})  # fmt: skip
            done.append(req.user_id)
        return done
