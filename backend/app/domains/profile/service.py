import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.events import bus
from app.domains.governance.service import audit
from app.domains.profile.catalog import FIELDS, SOURCE_RANK, SOURCE_TYPES, InvalidFact, normalise_value
from app.domains.profile.models import Fact
from app.engines import cashflow, debt
from app.engines.money import D
from app.infra.errors import AppError

# PLACEHOLDER (freshness/contradiction rules are PENDING PRODUCT APPROVAL, D-B8): relative change above which a new
# value is flagged as a material change the user should confirm.
MATERIAL_CHANGE_RATIO = Decimal("0.30")


@dataclass
class RecordResult:
    fact: Fact
    changed: bool
    superseded: Fact | None
    material_change: bool


def _now() -> datetime:
    return datetime.now(UTC)


def _material(old: str, new: str, kind: str) -> bool:
    if kind != "money":
        return old != new
    o, n = Decimal(old), Decimal(new)
    if o == 0:
        return n != 0
    return abs(n - o) / o > MATERIAL_CHANGE_RATIO


def derive_inputs(raw: dict[str, Decimal | bool | None]) -> dict[str, Decimal | bool | None]:
    """Pure: add derived measures (savings rate, emergency months, debt-to-income) to typed stated facts.
    Shared by scoring and by what-if simulations so both use identical derivations."""
    out = dict(raw)
    income = out.get("annual_income")
    monthly_income = income / 12 if isinstance(income, Decimal) else None
    out["monthly_income"] = monthly_income
    exp, liquid, emi = out.get("monthly_expenses"), out.get("liquid_assets"), out.get("monthly_emi_total")
    out["savings_rate"] = (
        cashflow.savings_rate(monthly_income, exp) if isinstance(monthly_income, Decimal) and isinstance(exp, Decimal) else None
    )
    out["emergency_months"] = (
        cashflow.emergency_months(liquid, exp) if isinstance(liquid, Decimal) and isinstance(exp, Decimal) else None
    )
    out["debt_to_income"] = (
        debt.debt_to_income(emi, monthly_income) if isinstance(emi, Decimal) and isinstance(monthly_income, Decimal) else None
    )
    return out


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.s = session

    async def current_fact(self, user_id: uuid.UUID, key: str) -> Fact | None:
        q = select(Fact).where(Fact.user_id == user_id, Fact.field_key == key, Fact.valid_to.is_(None))
        return (await self.s.execute(q)).scalars().first()

    async def current_facts(self, user_id: uuid.UUID) -> list[Fact]:
        q = select(Fact).where(Fact.user_id == user_id, Fact.valid_to.is_(None)).order_by(Fact.field_key)
        return list((await self.s.execute(q)).scalars().all())

    async def history(self, user_id: uuid.UUID, key: str) -> list[Fact]:
        q = select(Fact).where(Fact.user_id == user_id, Fact.field_key == key).order_by(Fact.valid_from)
        return list((await self.s.execute(q)).scalars().all())

    async def record_fact(
        self, user_id: uuid.UUID, key: str, raw_value: object, *, source_type: str, source_ref: str | None = None,
        confidence: Decimal = Decimal("1.0"), user_correction: bool = False, actor_ip: str | None = None,
        request_id: str | None = None,
    ) -> RecordResult:  # fmt: skip
        """Append a fact version. Rules: only catalogued keys; INFERRED/ESTIMATED never replace a USER_STATED/CONNECTED
        fact unless the user explicitly corrects; identical value is a no-op; every change is audited."""
        field = FIELDS.get(key)
        if field is None:
            raise AppError(422, "unknown_field", "Unknown financial field", key)
        if source_type not in SOURCE_TYPES:
            raise AppError(422, "validation_error", "Unknown source type")
        try:
            value = normalise_value(field, raw_value)
        except InvalidFact as e:
            raise AppError(422, "invalid_fact", "Invalid value", str(e)) from e
        current = await self.current_fact(user_id, key)
        if current is not None and current.value == value:
            return RecordResult(current, False, None, False)
        if current is not None and not user_correction and SOURCE_RANK[source_type] < SOURCE_RANK[current.source_type]:
            raise AppError(409, "source_precedence", "A lower-trust source cannot replace a stated fact",
                           f"{source_type} cannot replace {current.source_type} for {key}")  # fmt: skip
        now = _now()
        new = Fact(
            id=uuid.uuid4(), user_id=user_id, field_key=key, value=value, source_type=source_type, source_ref=source_ref,
            confidence=confidence, verification_state="stated", valid_from=now,
        )  # fmt: skip
        material = False
        if current is not None:
            material = _material(current.value, value, field.kind)
            current.valid_to = now
            current.superseded_by = new.id
            await self.s.flush()  # close the old row first so the partial unique index is never violated
        self.s.add(new)
        await self.s.flush()
        await audit(self.s, action="fact.recorded" if current is None else "fact.superseded", entity_type="fact",
                    entity_id=str(new.id), actor_user_id=user_id, ip=actor_ip, request_id=request_id,
                    meta={"field": key, "source_type": source_type, "user_correction": user_correction,
                          "material_change": material})  # fmt: skip
        bus.publish(self.s, user_id, bus.FACT_CHANGED, {"field_key": key})
        return RecordResult(new, True, current, material)

    async def raw_inputs(self, user_id: uuid.UUID) -> dict[str, Decimal | bool | None]:
        """Stated facts only, typed (no derived values)."""
        facts = {f.field_key: f.value for f in await self.current_facts(user_id)}
        out: dict[str, Decimal | bool | None] = {}
        for k, v in facts.items():
            kind = FIELDS[k].kind
            out[k] = v == "true" if kind == "bool" else (D(v) if kind in ("money", "int") else None)
        return out

    async def inputs(self, user_id: uuid.UUID) -> dict[str, Decimal | bool | None]:
        """Scoring/trait inputs: stated facts plus values DERIVED by the deterministic engines."""
        return derive_inputs(await self.raw_inputs(user_id))
