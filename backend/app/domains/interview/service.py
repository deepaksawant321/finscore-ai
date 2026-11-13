import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.extraction import Candidate, extract
from app.ai.gateway import LLMProvider
from app.ai.intents import classify_intents
from app.domains.governance.advice import (
    BLOCKED_CLASSES,
    DISTRESS_RESPONSE,
    SAFE_DECLINE,
    asks_for_regulated_advice,
    classify_output,
    indicates_distress,
)
from app.domains.governance.escalation import create_escalation
from app.domains.governance.service import active_consent, audit
from app.domains.interview.models import Conversation, Message, MessageExtraction
from app.domains.profile.catalog import FIELDS, INTERVIEW_ORDER
from app.domains.profile.service import ProfileService
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, load_rulebook

OPENING = "What is the one money problem you want to solve right now?"
DISCLOSURE = (
    "I'm an AI assistant. I help you organise your finances and understand your options; I'm not a human adviser and "
    "I don't give regulated investment advice. All numbers come from a calculation engine, not from the AI model. "
    "Nothing I say is saved as a fact until you confirm it."
)
# Intent -> fields to ask about first (relevance boost). PLACEHOLDER ordering, not an approved rule (blueprint: PROPOSED).
INTENT_BOOST: dict[str, tuple[str, ...]] = {
    "retirement": ("age", "retirement_age", "monthly_investment", "annual_income"),
    "debt": ("monthly_emi_total", "annual_income"),
    "insurance": ("has_health_insurance", "has_term_insurance", "dependants"),
    "cash_flow": ("annual_income", "monthly_expenses"),
    "investment": ("monthly_investment", "annual_income", "monthly_expenses"),
    "major_purchase": ("annual_income", "monthly_emi_total", "liquid_assets"),
}
READY_FIELDS = ("annual_income", "monthly_expenses")  # minimum for a first (demo) score reveal


@dataclass
class Turn:
    assistant_text: str
    proposals: list[dict[str, object]]
    next_question: dict[str, str] | None
    progress: dict[str, int]
    ready_for_score: bool
    message_id: uuid.UUID
    escalation_suggested: bool = False
    advice_class: str = "information"
    escalation_id: uuid.UUID | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def select_next_field(known: set[str], pending: set[str], intents: list[str]) -> str | None:
    """Deterministic question selector: relevance to the user's stated problem first, then default order. The LLM never picks."""
    boosted: list[str] = []
    for i in intents:
        for k in INTENT_BOOST.get(i, ()):
            if k not in boosted:
                boosted.append(k)
    order = [k for k in (*boosted, *INTERVIEW_ORDER) if k in FIELDS]
    for k in dict.fromkeys(order):
        if k not in known and k not in pending:
            return k
    return None


def indian_group(n: int) -> str:
    """1234567 -> '12,34,567' (lakh/crore grouping, display only)."""
    s = str(abs(n))
    head, tail = s[:-3], s[-3:]
    parts: list[str] = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    out = ",".join([*parts, tail]) if parts else tail
    return ("-" if n < 0 else "") + out


def _fmt(key: str, value: str) -> str:
    kind = FIELDS[key].kind
    if kind == "money":
        return "₹" + indian_group(int(float(value)))
    if kind == "bool":
        return "yes" if value == "true" else "no"
    return value


class InterviewService:
    def __init__(self, session: AsyncSession, provider: LLMProvider | None) -> None:
        self.s, self.provider = session, provider
        self.profile = ProfileService(session)

    async def _get_conv(self, user_id: uuid.UUID, conv_id: uuid.UUID) -> Conversation:
        c = await self.s.get(Conversation, conv_id)
        if c is None or c.user_id != user_id:  # never reveal other users' conversations
            raise AppError(404, "not_found", "Conversation not found")
        return c

    async def assert_owner(self, user_id: uuid.UUID, conv_id: uuid.UUID) -> None:
        await self._get_conv(user_id, conv_id)

    async def _add_msg(self, conv_id: uuid.UUID, role: str, content: str, advice_class: str | None = None) -> Message:
        m = Message(
            id=uuid.uuid4(), conversation_id=conv_id, role=role, content=content, advice_class=advice_class, created_at=_now()
        )
        self.s.add(m)
        await self.s.flush()
        return m

    async def _guarded_reply(self, conv: Conversation, user_id: uuid.UUID, text: str, request_id: str | None) -> Turn | None:
        """Governance guard that runs BEFORE extraction: distress => support + human flag; request for regulated advice => safe decline."""
        if indicates_distress(text):
            esc = await create_escalation(
                self.s, user_id, "distress", None, conv.id, request_id
            )  # note stays empty: no sensitive text copied
            am = await self._add_msg(conv.id, "assistant", DISTRESS_RESPONSE, "information")
            return Turn(
                DISTRESS_RESPONSE,
                [],
                None,
                {"known": 0, "total": len(INTERVIEW_ORDER)},
                False,
                am.id,
                True,
                "information",
                esc.id,
            )
        if asks_for_regulated_advice(text):
            await audit(self.s, action="advice.regulated_request_declined", entity_type="conversation", entity_id=str(conv.id),
                        actor_user_id=user_id, request_id=request_id)  # fmt: skip
            am = await self._add_msg(conv.id, "assistant", SAFE_DECLINE, "information")
            return Turn(
                SAFE_DECLINE, [], None, {"known": 0, "total": len(INTERVIEW_ORDER)}, False, am.id, True, "information", None
            )
        return None

    async def start(self, user_id: uuid.UUID, mode: str) -> tuple[Conversation, Message]:
        if await active_consent(self.s, user_id, "ai_processing") is None:
            raise AppError(403, "consent_required", "AI processing consent is required",
                           "Please agree to AI processing of what you tell me before we start.")  # fmt: skip
        conv = Conversation(id=uuid.uuid4(), user_id=user_id, mode=mode, intents=[])
        self.s.add(conv)
        await self.s.flush()
        msg = await self._add_msg(conv.id, "assistant", OPENING)
        await audit(self.s, action="conversation.started", entity_type="conversation", entity_id=str(conv.id),
                    actor_user_id=user_id, meta={"mode": mode})  # fmt: skip
        return conv, msg

    async def transcript(self, user_id: uuid.UUID, conv_id: uuid.UUID) -> list[Message]:
        await self._get_conv(user_id, conv_id)
        q = select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at)
        return list((await self.s.execute(q)).scalars().all())

    async def _pending_fields(self, conv_id: uuid.UUID) -> set[str]:
        rows = (
            (await self.s.execute(select(MessageExtraction).where(MessageExtraction.conversation_id == conv_id))).scalars().all()
        )
        return {str(p["field_key"]) for r in rows for p in r.proposals if p["status"] == "pending"}

    async def send(self, user_id: uuid.UUID, conv_id: uuid.UUID, text: str, request_id: str | None = None) -> Turn:
        conv = await self._get_conv(user_id, conv_id)
        user_msg = await self._add_msg(conv.id, "user", text)
        guarded = await self._guarded_reply(conv, user_id, text, request_id)
        if guarded is not None:
            return guarded
        intents = sorted(set(conv.intents) | (set(classify_intents(text)) - {"general_health"}))
        conv.intents = intents
        cands: list[Candidate] = await extract(text, conv.awaiting_field, self.provider)
        proposals: list[dict[str, object]] = [
            {"id": uuid.uuid4().hex, "field_key": c.field_key, "label": FIELDS[c.field_key].label, "value": c.value,
             "display": _fmt(c.field_key, c.value), "evidence": c.evidence, "rationale": c.rationale,
             "confidence": str(c.confidence), "origin": c.origin, "status": "pending"}
            for c in cands
        ]  # fmt: skip
        if proposals:
            self.s.add(MessageExtraction(id=uuid.uuid4(), message_id=user_msg.id, conversation_id=conv.id,
                                         proposals=proposals, created_at=_now()))  # fmt: skip
        known = {f.field_key for f in await self.profile.current_facts(user_id)}
        pending = await self._pending_fields(conv.id) | {str(p["field_key"]) for p in proposals}
        # Ask next: first let the user confirm what I just captured; then continue with the next most useful question.
        nxt = select_next_field(known, pending, intents)
        conv.awaiting_field = nxt
        total = len(INTERVIEW_ORDER)
        progress = {"known": len(known & set(INTERVIEW_ORDER)), "total": total}
        ready = all(k in known or k in pending for k in READY_FIELDS)
        reply = self._compose(proposals, nxt, progress)
        advice = classify_output(reply)
        blocked = advice in BLOCKED_CLASSES  # perimeter not approved (D-B9): never show regulated-class output
        if blocked:
            reply, advice = SAFE_DECLINE, "information"
        am = await self._add_msg(conv.id, "assistant", reply, advice)
        nq = None if nxt is None else {"field_key": nxt, "text": FIELDS[nxt].question, "why": FIELDS[nxt].why}
        return Turn(reply, proposals, nq, progress, ready, am.id, blocked, advice)

    @staticmethod
    def _compose(proposals: list[dict[str, object]], nxt: str | None, progress: dict[str, int]) -> str:
        parts: list[str] = []
        if proposals:
            caught = ", ".join(f"{p['label']}: {p['display']}" for p in proposals)
            parts.append(f"Here is what I understood — {caught}. Please confirm or correct it on the right.")
        else:
            parts.append("Thanks. I couldn't pin down a specific figure from that, so I haven't recorded anything.")
        if nxt:
            parts.append(f"{FIELDS[nxt].why} {FIELDS[nxt].question}")
        else:
            parts.append("I have everything I need for an initial picture.")
        if progress["known"] >= 3:
            parts.append(f"(Progress: {progress['known']} of {progress['total']} details confirmed.)")
        return " ".join(parts)

    async def confirm(
        self, user_id: uuid.UUID, conv_id: uuid.UUID, decisions: list[dict[str, str | None]], request_id: str | None
    ) -> list[dict[str, object]]:
        conv = await self._get_conv(user_id, conv_id)
        rows = (
            (await self.s.execute(select(MessageExtraction).where(MessageExtraction.conversation_id == conv.id))).scalars().all()
        )
        by_id = {str(p["id"]): (r, p) for r in rows for p in r.proposals}
        recorded: list[dict[str, object]] = []
        for d in decisions:
            pid, action = str(d.get("proposal_id")), d.get("action")
            if pid not in by_id:
                raise AppError(404, "not_found", "Proposal not found")
            row, prop = by_id[pid]
            if prop["status"] != "pending":
                continue
            if action == "reject":
                prop["status"] = "rejected"
            elif action in ("accept", "edit"):
                value = d.get("value") if action == "edit" and d.get("value") is not None else prop["value"]
                res = await self.profile.record_fact(
                    user_id, str(prop["field_key"]), value, source_type="USER_STATED", source_ref=f"message:{row.message_id}",
                    confidence=__import__("decimal").Decimal("1.0"), user_correction=(action == "edit"), request_id=request_id,
                )  # fmt: skip
                prop["status"] = "accepted" if action == "accept" else "edited"
                recorded.append(
                    {"field_key": res.fact.field_key, "value": res.fact.value, "material_change": res.material_change}
                )
            else:
                raise AppError(422, "validation_error", "action must be accept, edit or reject")
            row.proposals = [dict(p) for p in row.proposals]  # reassign so JSON change is detected
        return recorded

    async def coverage(self, user_id: uuid.UUID) -> list[dict[str, object]]:
        """Per scoring pillar: Unknown / Partial / Stated / Verified. 'Stale' needs freshness windows (PENDING, D-B8)."""
        facts = {f.field_key: f for f in await self.profile.current_facts(user_id)}
        inputs = await self.profile.inputs(user_id)
        rb = load_rulebook(DEFAULT_VERSION)
        out: list[dict[str, object]] = []
        for p in rb.score_spec().pillars:
            if p.measure is None:
                out.append({"pillar_id": p.id, "name": p.name, "state": "Unknown", "calculator": False, "missing": []})
                continue
            missing = [k for k in p.measure.inputs if inputs.get(k) is None]
            if len(missing) == len(p.measure.inputs):
                state = "Unknown"
            elif missing:
                state = "Partial"
            else:
                state = "Stated"
                if all(facts[k].verification_state == "verified" for k in p.measure.inputs if k in facts):
                    state = "Verified" if any(k in facts for k in p.measure.inputs) else "Stated"
            out.append({"pillar_id": p.id, "name": p.name, "state": state, "calculator": True, "missing": missing})
        return out
