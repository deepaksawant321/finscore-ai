"""Coach tools: read-only, scoped to the calling user's id (the LLM never chooses a user id). Every tool returns plain
deterministic statements; every number in a reply must come from these statements or from the user's own message."""

import re
import uuid
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.actions.service import ActionService
from app.domains.goals.models import Goal
from app.domains.goals.service import GoalService, funding_view
from app.domains.interview.service import InterviewService, _fmt
from app.domains.profile.catalog import FIELDS
from app.domains.profile.service import ProfileService
from app.domains.scoring.models import ScoreRun
from app.domains.scoring.service import ScoringService
from app.domains.simulation.service import SimulationService
from app.domains.simulation.specs import Invest, ScoreWhatIf
from app.engines.money import D, find_amounts, format_inr
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, load_rulebook

DEMO_NOTE = "These numbers use DEMO rules, not an official FinScore."
MAX_DRIVERS = 3


@dataclass
class ToolResult:
    tool: str
    lines: list[str]
    ok: bool = True
    caveats: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join([*self.lines, *self.caveats])


inr = format_inr


def points(v: str | Decimal) -> str:
    d = D(str(v)).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
    return f"{'+' if d > 0 else ''}{d}"


def _whole(v: Decimal) -> str:
    return str(v.quantize(Decimal("1"), rounding="ROUND_HALF_UP"))


class CoachTools:
    def __init__(self, session: AsyncSession, settings: Settings, user_id: uuid.UUID) -> None:
        self.s, self.cfg, self.uid = session, settings, user_id
        self.scoring = ScoringService(session, settings)

    async def _latest(self) -> ScoreRun | None:
        return await self.scoring.latest(self.uid)

    @staticmethod
    def _no_score() -> ToolResult:
        return ToolResult(
            "get_score", ["You don't have a score yet. Tell me about your income and expenses in the interview first."], ok=False
        )

    def _demo(self, run: ScoreRun) -> list[str]:
        return [] if run.official else [DEMO_NOTE]

    # ---- score tools ----
    async def get_score(self) -> ToolResult:
        run = await self._latest()
        if run is None:
            return self._no_score()
        rb = load_rulebook(run.rulebook_version)
        early = run.confidence < rb.min_confidence_for_stage()
        lines = [f"Your FinScore is {_whole(run.overall)} (data confidence {_whole(run.confidence * 100)}%)."]
        if early:
            lines.append("This is an early estimate, because I still know too little to place you in a wealth stage.")
        else:
            lines.append(
                f"Your wealth stage is {run.stage}{' (provisional until the age matrix is approved)' if run.stage_provisional else ''}."
            )
        lines.append(f"Trend: {run.trend}.")
        return ToolResult("get_score", lines, caveats=self._demo(run))

    async def explain_score(self) -> ToolResult:
        run = await self._latest()
        if run is None:
            return self._no_score()
        ex = ScoringService.explain(run)
        pos = list(ex["positive_drivers"])[:MAX_DRIVERS]  # type: ignore[call-overload]
        neg = list(ex["negative_drivers"])[:MAX_DRIVERS]  # type: ignore[call-overload]
        lines = [
            f"Your score is {_whole(run.overall)}: a reference of {_whole(run.reference)} plus what each area adds or removes."
        ]
        if run.confidence < load_rulebook(run.rulebook_version).min_confidence_for_stage():
            lines.append(
                f"This is an early estimate: my data confidence is only {_whole(run.confidence * 100)}%, so treat the number with caution."
            )
        if pos:
            lines.append(
                "Helping you most: " + "; ".join(f"{p['name']} ({points(str(p['contribution']))} points)" for p in pos) + "."
            )
        if neg:
            lines.append(
                "Holding you back most: " + "; ".join(f"{p['name']} ({points(str(p['contribution']))} points)" for p in neg) + "."
            )
        n_unscored = len(ex["not_scored"])  # type: ignore[arg-type]
        if n_unscored:
            lines.append(f"{n_unscored} areas are not scored yet, so they do not move the number.")
        return ToolResult("explain_score", lines, caveats=self._demo(run))

    async def score_change(self) -> ToolResult:
        runs = await self.scoring.history(self.uid, 2)
        if len(runs) < 2:
            return ToolResult(
                "score_change",
                ["I need at least two score checks to compare. Your score has only been computed once so far."],
                ok=False,
            )
        new, old = runs[0], runs[1]
        cmp = ScoringService.compare(old, new)
        lines = [f"Your score moved from {_whole(D(str(cmp['from_score'])))} to {_whole(D(str(cmp['to_score'])))}."]
        for c in list(cmp["material_changes"])[:MAX_DRIVERS]:  # type: ignore[call-overload]
            lines.append(f"{c['name']}: {points(str(c['points_change']))} points.")
        if not cmp["material_changes"]:
            lines.append("No single area changed enough to call out.")
        return ToolResult("score_change", lines, caveats=self._demo(new))

    async def stage_info(self) -> ToolResult:
        rb = load_rulebook(DEFAULT_VERSION)
        lines = ["The eight wealth stages by score band:"]
        lines += [f"{st.name}: {st.lo} to {st.hi}" for st in rb.stages()]
        run = await self._latest()
        if run is not None:
            lines.append(f"You are currently in {run.stage}.")
        return ToolResult(
            "stage_info",
            lines,
            caveats=["Your age may change your stage once the age matrix is approved; today the stage uses score bands only."],
        )

    # ---- profile tools ----
    async def profile_summary(self) -> ToolResult:
        facts = await ProfileService(self.s).current_facts(self.uid)
        if not facts:
            return ToolResult("profile_summary", ["I haven't saved any facts about you yet."], ok=False)
        lines = ["What I have saved about you (all confirmed by you):"]
        lines += [f"{FIELDS[f.field_key].label}: {_fmt(f.field_key, f.value)}" for f in facts if f.field_key in FIELDS]
        return ToolResult("profile_summary", lines)

    async def missing_data(self) -> ToolResult:
        cov = await InterviewService(self.s, None).coverage(self.uid)
        todo = [c for c in cov if c["calculator"] and c["state"] in ("Unknown", "Partial")]
        if not todo:
            return ToolResult("missing_data", ["Every area I can currently score has the data it needs."])
        keys = sorted({k for c in todo for k in c["missing"]})  # type: ignore[attr-defined]
        labels = [FIELDS[k].label for k in keys if k in FIELDS]
        lines = [
            f"{len(todo)} scored areas are missing some information.",
            "Adding these would raise my confidence: " + ", ".join(labels) + ".",
        ]
        return ToolResult("missing_data", lines)

    # ---- goal tools ----
    async def goals_overview(self) -> ToolResult:
        goals = await GoalService(self.s).list(self.uid)
        if not goals:
            return ToolResult("goals_overview", ["You haven't set any goals yet. You can add one on the Goals page."], ok=False)
        lines = [f"You have {len(goals)} active goal(s):"]
        lines += [f"{g.name}: {inr(g.target_amount_today)} in today's money by {g.target_date.isoformat()}" for g in goals[:10]]
        return ToolResult("goals_overview", lines)

    async def goal_status(self, text: str, today: date | None = None) -> ToolResult:
        goals = await GoalService(self.s).list(self.uid)
        if not goals:
            return ToolResult("goal_status", ["You haven't set any goals yet, so there is nothing to check."], ok=False)
        ret, infl = parse_assumptions(text)
        if ret is None or infl is None:
            return ToolResult(
                "goal_status",
                ["To check a goal I need your own assumptions, because I don't use default returns or inflation."],
                ok=False,
                caveats=["Tell me, for example: 'Is my goal on track assuming 8% return and 6% inflation?'"],
            )
        g = pick_goal(goals, text)
        if g is None:
            names = ", ".join(x.name for x in goals[:8])
            return ToolResult("goal_status", [f"Which goal do you mean? You have: {names}."], ok=False)
        v = funding_view(g, ret, infl, today)
        lines = [
            f"Goal: {g.name}, {v.months_remaining} months to go.",
            f"Target after inflation: {inr(v.future_target)}.",
            f"Projected from what you have and put aside monthly: {inr(v.projected_total)}.",
        ]
        if v.shortfall > 0:
            lines.append(
                f"Shortfall: {inr(v.shortfall)}. To close it you would need about {inr(v.required_monthly_additional)} more per month."
            )
        else:
            lines.append(f"On track: projected to exceed the target by {inr(-v.shortfall)}.")
        return ToolResult("goal_status", lines, caveats=[*v.assumptions])

    # ---- what-if (Simulate mode) ----
    async def what_if(self, text: str) -> ToolResult:
        """Understands two phrasings deterministically: investing a monthly amount, and a change to monthly expenses.
        Anything else falls back to the goal check. All maths is done by the simulation engines."""
        low = text.lower()
        amounts = find_amounts(text)
        if re.search(r"\b(invest|sip|put aside|save)\b", low) and amounts and not re.search(r"\bexpenses?\b", low):
            return await self._what_if_invest(text, amounts[0].value)
        if re.search(r"\b(expenses?|spend\w*)\b", low) and amounts:
            return await self._what_if_expenses(low, amounts[0].value)
        return await self.goal_status(text)

    async def _what_if_invest(self, text: str, monthly: Decimal) -> ToolResult:
        ret, infl = parse_assumptions(text)
        yrs = re.search(r"(\d{1,2})\s*(?:years?|yrs?)", text, re.I)
        if ret is None or yrs is None:
            return ToolResult(
                "what_if",
                [
                    "To project that I need two things from you: how many years, and the yearly return you want to assume. I don't use default returns."
                ],
                ok=False,
                caveats=["For example: 'What if I invest 10k a month for 10 years at 12% return?'"],
            )
        try:
            sim = await SimulationService(self.s, self.cfg).run(
                self.uid, Invest(monthly_amount=monthly, years=int(yrs.group(1)), return_pct=ret, inflation_pct=infl)
            )
        except AppError as e:
            return ToolResult("what_if", [f"I couldn't run that: {e.title}."], ok=False)
        r: dict[str, Any] = sim.result
        lines = [
            f"If you invest {inr(monthly)} a month for {yrs.group(1)} years at {ret}% a year, you would have about {inr(str(r['final_value']))}.",
            f"You would put in {inr(str(r['total_contributed']))}; the growth would be about {inr(str(r['gain']))}.",
        ]
        if r["real_value"] is not None:
            lines.append(f"In today's money that is roughly {inr(str(r['real_value']))}.")
        return ToolResult("what_if", lines, caveats=list(r["assumptions"]))

    async def _what_if_expenses(self, low: str, amount: Decimal) -> ToolResult:
        cur = await ProfileService(self.s).current_fact(self.uid, "monthly_expenses")
        if cur is None:
            return ToolResult(
                "what_if",
                ["I don't know your monthly expenses yet, so I can't compare. Tell me in the interview first."],
                ok=False,
            )
        now = D(cur.value)
        if re.search(r"\b(cut|reduce|lower|decrease|save)\b", low):
            new = max(Decimal(0), now - amount)
        elif re.search(r"\b(increase|raise|add)\b", low):
            new = now + amount
        else:
            new = amount
        try:
            sim = await SimulationService(self.s, self.cfg).run(self.uid, ScoreWhatIf(overrides={"monthly_expenses": str(new)}))
        except AppError as e:
            return ToolResult(
                "what_if",
                [f"I couldn't run that: {e.title}."],
                ok=False,
                caveats=[e.detail] if e.detail else [],
            )
        r: dict[str, Any] = sim.result
        b, sc = r["baseline"], r["scenario"]
        delta = D(str(r["delta"]))
        move = "would not change" if delta == 0 else f"would move by {points(delta)} points"
        lines = [
            f"If your monthly expenses were {inr(new)} instead of {inr(now)}, your score {move}: from {_whole(D(b['overall']))} to {_whole(D(sc['overall']))}.",
            "Nothing was saved: this is only a what-if.",
        ]
        return ToolResult("what_if", lines, caveats=[] if sim.official else [DEMO_NOTE])

    # ---- Act mode ----
    async def next_actions(self) -> ToolResult:
        """Top actions from the DEMO action library. Score effects are computed by the score engine, never typed in."""
        try:
            views = await ActionService(self.s, self.cfg).refresh(self.uid)
        except AppError:
            return ToolResult(
                "act",
                ["I can't suggest actions yet: the official action rules have not been approved."],
                ok=False,
                caveats=["I can still show what is holding your score back and which information is missing."],
            )
        open_ = [v for v in views if v.row.state in ("suggested", "accepted", "in_progress")][:3]
        if not open_:
            return ToolResult(
                "act",
                [
                    "I don't see an action that would raise your score right now. Telling me more about your finances can reveal more."
                ],
                ok=False,
            )
        lines = ["Here are your top actions from the demo action list, in priority order:"]
        for i, v in enumerate(open_, 1):
            lines.append(f"{i}. {v.title}: {v.cta} Expected score change: {points(v.row.expected_delta)} points.")
        return ToolResult(
            "act",
            lines,
            caveats=[
                "This is a demo action list, not an approved one. You can accept or skip actions on the Actions page.",
                DEMO_NOTE,
            ],
        )


_PCT = r"(\d{1,2}(?:\.\d+)?)\s*(?:%|percent|per cent)"
_RET = re.compile(
    rf"{_PCT}\s*(?:p\.?a\.?\s*)?(?:annual\s+)?(?:returns?|growth)|(?:returns?|growth)\s*(?:of|at|is|=)?\s*{_PCT}", re.I
)
_INF = re.compile(rf"{_PCT}\s*(?:annual\s+)?inflation|inflation\s*(?:of|at|is|=)?\s*{_PCT}", re.I)


def _first(m: re.Match[str] | None) -> Decimal | None:
    if m is None:
        return None
    return D(next(g for g in m.groups() if g))


def parse_assumptions(text: str) -> tuple[Decimal | None, Decimal | None]:
    """Both assumptions must be stated by the user in this message. No defaults: simulation assumptions are PENDING (D-B7)."""
    return _first(_RET.search(text)), _first(_INF.search(text))


def pick_goal(goals: list[Goal], text: str) -> Goal | None:
    low = text.lower()
    named = [g for g in goals if g.name.lower() in low]
    if len(named) == 1:
        return named[0]
    if len(goals) == 1:
        return goals[0]
    return None
