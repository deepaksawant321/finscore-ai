"""AI Financial Copilot (AC-18): pre-action checks and explanations, read-only/hand-off only — it never executes an
action, never recommends a product, and never changes anything in the account. Every check is deterministic; nothing
here calls an LLM. Checks are logged to the audit trail (no dedicated table: nothing is created for the user to manage)."""

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.actions.service import ActionService
from app.domains.goals.service import GoalService
from app.domains.governance.service import audit
from app.domains.profile.service import ProfileService, derive_inputs
from app.engines import copilot as eng
from app.engines.money import D
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, load_rulebook


@dataclass
class CopilotReport:
    context: str  # e.g. "action:build_emergency_fund" or "goal:new" / "goal:House"
    findings: list[eng.Finding]
    needs_hand_off: bool


def _value(raw: object) -> Decimal | bool | None:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        return D(raw)
    return None


class CopilotService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    async def _report(
        self, context: str, findings: list[eng.Finding], user_id: uuid.UUID, request_id: str | None
    ) -> CopilotReport:
        hand_off = any(f.hand_off for f in findings)
        await audit(self.s, action="copilot.check", entity_type="copilot", entity_id=context, actor_user_id=user_id, request_id=request_id,
                    meta={"levels": ",".join(sorted({f.level for f in findings})), "hand_off": str(hand_off)})  # fmt: skip
        return CopilotReport(context, findings, hand_off)

    async def _committed_monthly(
        self, user_id: uuid.UUID, exclude_goal_id: uuid.UUID | None = None
    ) -> tuple[Decimal | None, Decimal]:
        raw = await self.profile.raw_inputs(user_id)
        inputs = derive_inputs(raw)
        income = inputs.get("monthly_income")
        expenses = inputs.get("monthly_expenses") or Decimal(0)
        emi = inputs.get("monthly_emi_total") or Decimal(0)
        goals = await GoalService(self.s).list(user_id)
        goals_total = sum((g.monthly_funding for g in goals if g.id != exclude_goal_id), Decimal(0))
        committed = expenses + emi + goals_total
        return (income if isinstance(income, Decimal) else None), committed

    async def check_action(self, user_id: uuid.UUID, action_id: uuid.UUID, request_id: str | None = None) -> CopilotReport:
        view = await ActionService(self.s, self.cfg).get_view(user_id, action_id)
        specs = {s.key: s for s in load_rulebook(view.row.rulebook_version).action_specs()}
        spec = specs.get(view.row.catalog_key)
        if spec is None:
            raise AppError(409, "unknown_action", "This action is no longer in the action library, so I can't check it.")
        raw = await self.profile.raw_inputs(user_id)
        old_value = raw.get(spec.change.field)
        new_raw = view.row.params.get(spec.change.field)
        new_value = None if new_raw is None else _value(new_raw)
        t = load_rulebook(DEFAULT_VERSION).copilot_thresholds()
        findings: list[eng.Finding] = []
        # Affordability only means something for a change that actually alters a RECURRING monthly amount (spending or
        # EMI). A one-off reallocation (multiple_of) or a yes/no flag (set, e.g. buying insurance) adds no monthly
        # commitment of its own, so checking "this would commit X a month" against it would misattribute the user's
        # existing cash-flow position — if any — to a decision that did not cause it.
        if (
            spec.change.kind in ("target_savings_rate", "target_debt_ratio")
            and isinstance(old_value, Decimal)
            and isinstance(new_value, Decimal)
        ):
            income, committed_without_this = await self._committed_monthly(user_id)
            committed_after = committed_without_this + (new_value - old_value)
            if (aff := eng.affordability(income, committed_after, t)) is not None:
                findings.append(aff)
        findings += eng.action_notes(spec.change, old_value, new_value, t)
        return await self._report(f"action:{spec.key}", findings, user_id, request_id)

    async def check_goal(
        self, user_id: uuid.UUID, new_monthly_funding: Decimal, goal_id: uuid.UUID | None = None, request_id: str | None = None
    ) -> CopilotReport:
        context = f"goal:{goal_id}" if goal_id else "goal:new"
        if goal_id is not None:
            await GoalService(self.s).get(user_id, goal_id)  # 404s if it is not this user's goal
        income, committed_without_this = await self._committed_monthly(user_id, exclude_goal_id=goal_id)
        t = load_rulebook(DEFAULT_VERSION).copilot_thresholds()
        findings: list[eng.Finding] = []
        if (aff := eng.affordability(income, committed_without_this + new_monthly_funding, t)) is not None:
            findings.append(aff)
        return await self._report(context, findings, user_id, request_id)
