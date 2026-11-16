import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.events import bus
from app.domains.goals.models import Goal
from app.domains.governance.service import audit
from app.engines import growth
from app.engines.money import D, round_money
from app.infra.errors import AppError

PRIORITIES = ("essential", "important", "aspirational")
STATUSES = ("active", "achieved", "archived")
MAX_GOALS = 50
MAX_AMOUNT = Decimal("1e12")


@dataclass(frozen=True)
class FundingView:
    months_remaining: int
    future_target: Decimal
    projected_from_current: Decimal
    projected_from_monthly: Decimal
    projected_total: Decimal
    shortfall: Decimal  # positive = short, negative = surplus
    required_monthly_additional: Decimal
    funded_ratio: Decimal
    assumptions: tuple[str, ...]


def _today() -> date:
    return datetime.now(UTC).date()


def months_between(start: date, end: date) -> int:
    return max(0, (end.year - start.year) * 12 + (end.month - start.month) - (1 if end.day < start.day else 0))


def funding_view(goal: Goal, assumed_return_pct: Decimal, inflation_pct: Decimal, today: date | None = None) -> FundingView:
    """Deterministic funding picture under EXPLICIT caller-supplied assumptions (no defaults: simulation assumptions are
    PENDING PRODUCT APPROVAL, D-B7). Target is inflated from today's rupees to the target date."""
    today = today or _today()
    months = months_between(today, goal.target_date)
    # annual inflation compounded continuously over fractional years (monthly granularity), deterministic Decimal power
    future_target = round_money(D(goal.target_amount_today) * (1 + D(inflation_pct) / 100) ** (Decimal(months) / 12))
    from_current = growth.fv_lumpsum(goal.current_funding, assumed_return_pct, months).value
    from_monthly = growth.fv_sip(goal.monthly_funding, assumed_return_pct, months).value
    total = from_current + from_monthly
    shortfall = future_target - total
    if shortfall > 0 and months > 0:
        extra = growth.required_sip(shortfall, assumed_return_pct, months).value
    else:
        extra = D(0)
    ratio = (total / future_target) if future_target > 0 else D(1)
    return FundingView(
        months, future_target, from_current, from_monthly, round_money(total), round_money(shortfall), extra,
        round_money(ratio), (
            "Inflation compounds annually, pro-rated by month", "Months between today and the target date (whole months)",
            f"Assumed return {assumed_return_pct}% p.a. and inflation {inflation_pct}% p.a. were chosen by you for this view",
            "Existing funding grows as a lump sum; monthly funding is invested at each month end",
            "Projection, not a guarantee; excludes tax and fees",
        ),
    )  # fmt: skip


def validate(name: str, amount: Decimal, target: date, priority: str, current: Decimal, monthly: Decimal) -> None:
    if not name.strip():
        raise AppError(422, "validation_error", "Goal name is required")
    if not (Decimal(0) < amount <= MAX_AMOUNT):
        raise AppError(422, "validation_error", "Target amount must be positive and realistic")
    if current < 0 or monthly < 0 or current > MAX_AMOUNT or monthly > MAX_AMOUNT:
        raise AppError(422, "validation_error", "Funding amounts must be zero or positive")
    if priority not in PRIORITIES:
        raise AppError(422, "validation_error", f"Priority must be one of {list(PRIORITIES)}")
    if target <= _today():
        raise AppError(422, "validation_error", "Target date must be in the future")


class GoalService:
    def __init__(self, session: AsyncSession) -> None:
        self.s = session

    async def list(self, user_id: uuid.UUID, include_archived: bool = False) -> list[Goal]:
        q = select(Goal).where(Goal.user_id == user_id).order_by(Goal.target_date)
        if not include_archived:
            q = q.where(Goal.status != "archived")
        return list((await self.s.execute(q)).scalars().all())

    async def get(self, user_id: uuid.UUID, goal_id: uuid.UUID) -> Goal:
        g = await self.s.get(Goal, goal_id)
        if g is None or g.user_id != user_id:  # never reveal other users' goals
            raise AppError(404, "not_found", "Goal not found")
        return g

    async def create(
        self, user_id: uuid.UUID, name: str, amount: Decimal, target: date, priority: str, current: Decimal, monthly: Decimal,
        request_id: str | None = None,
    ) -> Goal:  # fmt: skip
        validate(name, amount, target, priority, current, monthly)
        count = (
            await self.s.execute(select(func.count()).select_from(Goal).where(Goal.user_id == user_id, Goal.status != "archived"))
        ).scalar_one()
        if count >= MAX_GOALS:
            raise AppError(409, "limit_reached", f"You can have at most {MAX_GOALS} active goals")
        g = Goal(id=uuid.uuid4(), user_id=user_id, name=name.strip(), target_amount_today=amount, target_date=target, priority=priority,
                 current_funding=current, monthly_funding=monthly, status="active", source="user")  # fmt: skip
        self.s.add(g)
        await self.s.flush()
        await audit(
            self.s, action="goal.created", entity_type="goal", entity_id=str(g.id), actor_user_id=user_id, request_id=request_id
        )
        bus.publish(self.s, user_id, bus.GOAL_UPDATED, {"goal_id": str(g.id), "kind": "created"})
        return g

    async def update(
        self, user_id: uuid.UUID, goal_id: uuid.UUID, changes: dict[str, object], request_id: str | None = None
    ) -> Goal:
        g = await self.get(user_id, goal_id)
        name = str(changes.get("name", g.name))
        amount = D(str(changes["target_amount_today"])) if "target_amount_today" in changes else g.target_amount_today
        target = changes.get("target_date", g.target_date)
        assert isinstance(target, date)
        priority = str(changes.get("priority", g.priority))
        current = D(str(changes["current_funding"])) if "current_funding" in changes else g.current_funding
        monthly = D(str(changes["monthly_funding"])) if "monthly_funding" in changes else g.monthly_funding
        status = str(changes.get("status", g.status))
        if status not in STATUSES:
            raise AppError(422, "validation_error", f"Status must be one of {list(STATUSES)}")
        if status == "active":  # past dates are allowed only for goals that are no longer active
            validate(name, amount, target, priority, current, monthly)
        g.name, g.target_amount_today, g.target_date, g.priority = name.strip(), amount, target, priority
        g.current_funding, g.monthly_funding, g.status = current, monthly, status
        await audit(self.s, action="goal.updated", entity_type="goal", entity_id=str(g.id), actor_user_id=user_id, request_id=request_id,
                    meta={"fields": sorted(changes)})  # fmt: skip
        bus.publish(self.s, user_id, bus.GOAL_UPDATED, {"goal_id": str(g.id), "kind": "updated"})
        return g

    async def delete(self, user_id: uuid.UUID, goal_id: uuid.UUID, request_id: str | None = None) -> None:
        g = await self.get(user_id, goal_id)
        await self.s.delete(g)
        await audit(
            self.s,
            action="goal.deleted",
            entity_type="goal",
            entity_id=str(goal_id),
            actor_user_id=user_id,
            request_id=request_id,
        )
        bus.publish(self.s, user_id, bus.GOAL_UPDATED, {"goal_id": str(goal_id), "kind": "deleted"})
