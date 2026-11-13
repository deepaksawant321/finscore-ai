import hashlib
import json
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.actions.service import DERIVED_FROM
from app.domains.governance.service import audit
from app.domains.health.models import HealthSnapshot
from app.domains.profile.service import ProfileService, derive_inputs
from app.engines import health as eng
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, RulebookNotApproved, assert_official_allowed, load_rulebook


@dataclass
class VitalView:
    key: str
    label: str
    status: str
    known: bool
    stale: bool
    value_display: str | None
    rule_text: str
    fact_age_days: int | None


@dataclass
class EventView:
    vital: str
    label: str
    kind: str
    from_status: str
    to_status: str
    message: str


@dataclass
class HealthReport:
    vitals: list[VitalView]
    overall: str
    data_quality: str
    events: list[EventView]
    official: bool
    checked_at: datetime
    snapshot_id: uuid.UUID | None = None
    notes: list[str] = field(default_factory=list)


def _now() -> datetime:
    return datetime.now(UTC)


def _display(spec: eng.VitalSpec, value: Decimal | bool | None) -> str | None:
    if value is None:
        return None
    if spec.unit == "flag":
        return "Yes" if value is True else "No"
    assert isinstance(value, Decimal)
    return f"{round(value * 100)}%" if spec.unit == "percent" else f"{value.quantize(Decimal('0.1'))} months"


def _num(spec: eng.VitalSpec, x: Decimal | bool | None) -> str:
    if isinstance(x, bool) or x is None:
        return ""
    return f"{round(x * 100)}%" if spec.unit == "percent" else f"{x.normalize():f} months"


def _rule_text(spec: eng.VitalSpec) -> str:
    if spec.kind == "flag":
        return "Green if you have it, red if not"
    if spec.kind == "higher":
        return f"Green at {_num(spec, spec.green)} or more, amber at {_num(spec, spec.amber)} or more"
    return f"Green at {_num(spec, spec.green)} or less, amber at {_num(spec, spec.amber)} or less"


def _message(label: str, e: eng.HealthEvent) -> str:
    return {
        "health_worse": f"{label} moved from {e.from_status} to {e.to_status}.",
        "health_better": f"{label} improved from {e.from_status} to {e.to_status}.",
        "newly_measured": f"{label} is now measured and shows {e.to_status}. This is new information, not a decline.",
        "went_stale": f"{label} may be out of date. Confirm the numbers behind it.",
        "refreshed": f"{label} was refreshed with newer numbers.",
    }[e.kind]


class HealthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    async def _latest(self, user_id: uuid.UUID) -> HealthSnapshot | None:
        q = select(HealthSnapshot).where(HealthSnapshot.user_id == user_id).order_by(HealthSnapshot.taken_at.desc()).limit(1)
        return (await self.s.execute(q)).scalars().first()

    def _guard(self) -> None:
        try:
            assert_official_allowed(load_rulebook(DEFAULT_VERSION), self.cfg.env)
        except RulebookNotApproved as e:
            raise AppError(503, "rulebook_not_approved", "Health monitoring is not available yet",
                           "The official health thresholds have not been approved by the Product Team.") from e  # fmt: skip

    async def _evaluate(self, user_id: uuid.UUID) -> tuple[list[VitalView], dict[str, eng.VitalState], str, str]:
        rb = load_rulebook(DEFAULT_VERSION)
        specs, fair = rb.health_vitals()
        stale_days = rb.nudge_thresholds()["stale_fact_days"]  # freshness windows are PENDING (D-B8): shared placeholder
        inputs = derive_inputs(await self.profile.raw_inputs(user_id))
        facts = {f.field_key: f for f in await self.profile.current_facts(user_id)}
        now = _now()
        views: list[VitalView] = []
        states: dict[str, eng.VitalState] = {}
        for sp in specs:
            value = inputs.get(sp.input)
            status = eng.vital_status(sp, value)
            feeding = [facts[k] for k in DERIVED_FROM.get(sp.input, (sp.input,)) if k in facts]
            age = max(((now - f.valid_from).days for f in feeding), default=None)
            known = value is not None
            stale = known and age is not None and age >= stale_days
            states[sp.key] = eng.VitalState(status, known, stale, None if value is None else str(value))
            views.append(
                VitalView(sp.key, sp.label, status, known, stale, _display(sp, value), _rule_text(sp), age if known else None)
            )
        ordered = list(states.values())
        return views, states, eng.overall_status(ordered), eng.data_quality(ordered, fair)

    @staticmethod
    def _digest(states: dict[str, eng.VitalState]) -> str:
        payload = {k: [v.value, v.stale] for k, v in sorted(states.items())}
        return hashlib.sha256(json.dumps(payload, separators=(",", ":")).encode()).hexdigest()

    @staticmethod
    def _events(raw: list[dict[str, str]], labels: dict[str, str]) -> list[EventView]:
        out = []
        for e in raw:
            ev = eng.HealthEvent(e["vital"], e["kind"], e["from_status"], e["to_status"])
            label = labels.get(ev.vital, ev.vital)
            out.append(EventView(ev.vital, label, ev.kind, ev.from_status, ev.to_status, _message(label, ev)))
        return out

    async def current(self, user_id: uuid.UUID) -> HealthReport:
        """Live view; writes nothing. Events come from the latest recorded check."""
        self._guard()
        rb = load_rulebook(DEFAULT_VERSION)
        views, _, overall, quality = await self._evaluate(user_id)
        last = await self._latest(user_id)
        labels = {v.key: v.label for v in views}
        return HealthReport(views, overall, quality, self._events(last.events, labels) if last else [], rb.is_official, _now(),
                            last.id if last else None)  # fmt: skip

    async def check(self, user_id: uuid.UUID, request_id: str | None = None) -> HealthReport:
        """Record a check when something changed (vital values or freshness); classify health vs data-quality changes."""
        self._guard()
        rb = load_rulebook(DEFAULT_VERSION)
        views, states, overall, quality = await self._evaluate(user_id)
        labels = {v.key: v.label for v in views}
        last = await self._latest(user_id)
        digest = self._digest(states)
        if last is not None and last.digest == digest:
            return HealthReport(
                views, overall, quality, self._events(last.events, labels), rb.is_official, last.taken_at, last.id
            )
        prev = None
        if last is not None:
            prev = {k: eng.VitalState(str(v["status"]), bool(v["known"]), bool(v["stale"]), None if v["value"] is None else str(v["value"]))
                    for k, v in last.vitals.items()}  # fmt: skip
        events = eng.classify_changes(prev, states)
        raw_events = [{"vital": e.vital, "kind": e.kind, "from_status": e.from_status, "to_status": e.to_status} for e in events]
        snap = HealthSnapshot(
            id=uuid.uuid4(), user_id=user_id, taken_at=_now(), digest=digest,
            vitals={k: {"status": v.status, "known": v.known, "stale": v.stale, "value": v.value} for k, v in states.items()},
            events=raw_events, overall=overall, data_quality=quality, rulebook_version=rb.version, official=rb.is_official,
        )  # fmt: skip
        self.s.add(snap)
        await self.s.flush()
        await audit(self.s, action="health.checked", entity_type="health_snapshot", entity_id=str(snap.id), actor_user_id=user_id,
                    request_id=request_id, meta={"overall": overall, "quality": quality, "events": str(len(raw_events))})  # fmt: skip
        return HealthReport(views, overall, quality, self._events(raw_events, labels), rb.is_official, snap.taken_at, snap.id)

    async def history(self, user_id: uuid.UUID, limit: int = 20) -> list[HealthSnapshot]:
        q = select(HealthSnapshot).where(HealthSnapshot.user_id == user_id).order_by(HealthSnapshot.taken_at.desc()).limit(limit)
        return list((await self.s.execute(q)).scalars().all())
