"""Money Map service: chapter progress, answering a card, instant facts, and the optional rewards.

Rewards (points, badges, active weeks) were approved by the PO on 2026-11-18 (D-B19) with these rules: they never feed
any score, there are no leaderboards, a missed week pauses rather than resets, and they can be switched off. The point
values below are PLACEHOLDERS. Points are only given when something new is learned (a first answer, or an assumption
replaced or confirmed), so editing the same value back and forth earns nothing.
"""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.journey.chapters import CARD_CHAPTER, CHAPTER_BY_KEY, CHAPTERS, FRIENDLY, Card, Chapter
from app.domains.journey.models import UserProgress
from app.domains.profile import derive
from app.domains.profile.catalog import FIELDS
from app.domains.profile.models import Fact
from app.domains.profile.quick import EQUITY_SHARE, record_planning_assumptions, record_savings_mix
from app.domains.profile.service import ProfileService
from app.domains.scoring.matrix_service import FIELD_FACTORS, MatrixScoreRun, MatrixScoringService
from app.engines.matrix_score import MatrixScoreResult
from app.infra.errors import AppError

POINTS = {"answer": 10, "assumption": 5, "chapter": 50, "checkin": 10}  # PLACEHOLDER values
BADGES = {
    "first_score": "First score",
    "protected": "Protected",
    "tax_smart": "Tax smart",
    "fine_tuned": "Fine-tuned",
    "full_picture": "Full picture",
    "steady_4": "Four active weeks",
}
FACTORS_OF = {
    **FIELD_FACTORS,
    "age": ("F06", "F08"),
    "annual_income": ("F06", "F01", "F02"),
    "monthly_investment": ("F10", "F02"),  # the investing habit first: that is what the question is about
    "savings_mix": ("F03", "F05"),
}


def _now() -> datetime:
    return datetime.now(UTC)


def iso_week(d: datetime) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


@dataclass
class Status:
    chapter: Chapter
    todo: list[Card]  # unanswered or assumed, in card order
    done: int
    total: int

    @property
    def complete(self) -> bool:
        return not self.todo


@dataclass
class AnswerResult:
    insight: str
    measured_before: Decimal
    measured_after: Decimal
    chapter: str
    chapter_complete: bool
    score: MatrixScoreRun | None  # only when a chapter was completed (an audited calculation)
    points_awarded: int | None
    new_badges: list[str] = field(default_factory=list)


class JourneyService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)
        self.scoring = MatrixScoringService(session, settings)

    # ------------------------------------------------------------------ progress
    async def _facts(self, user_id: uuid.UUID) -> dict[str, Fact]:
        return {f.field_key: f for f in await self.profile.current_facts(user_id)}

    @staticmethod
    def card_state(card: Card, facts: dict[str, Fact], raw: dict[str, Decimal | bool | None]) -> str:
        """done | todo | assumed | na"""
        if card.ask_when is not None and not card.ask_when(raw):
            return "na"
        if card.key == "savings_mix":
            return "done" if "equity_holdings" in facts and "debt_holdings" in facts else "todo"
        f = facts.get(card.key)
        if f is None:
            return "todo"
        return "assumed" if f.source_type == "ESTIMATED" else "done"

    async def statuses(self, user_id: uuid.UUID) -> list[Status]:
        facts = await self._facts(user_id)
        raw = await self.profile.raw_inputs(user_id)
        out = []
        for ch in CHAPTERS:
            states = [(c, self.card_state(c, facts, raw)) for c in ch.cards]
            applicable = [(c, s) for c, s in states if s != "na"]
            out.append(
                Status(
                    ch,
                    [c for c, s in applicable if s in ("todo", "assumed")],
                    sum(s == "done" for _, s in applicable),
                    len(applicable),
                )
            )
        return out

    async def measured(self, user_id: uuid.UUID) -> tuple[Decimal, MatrixScoreResult | None]:
        r = await self.scoring.preview(user_id)
        return (r.confidence if r else Decimal(0)), r

    async def progress(self, user_id: uuid.UUID) -> UserProgress:
        p = await self.s.get(UserProgress, user_id)
        if p is None:
            p = UserProgress(user_id=user_id, points=0, badges=[], active_weeks=0, rewards_enabled=True, updated_at=_now())
            self.s.add(p)
            await self.s.flush()
        return p

    @staticmethod
    def unlocked(statuses: list[Status], key: str) -> bool:
        return key == "snapshot" or statuses[0].complete

    # ------------------------------------------------------------------ answering
    def _parse(self, card: Card, value: str | None, mix: str | None) -> str:
        if value is None or value.strip() == "":
            raise AppError(422, "validation_error", "An answer is required")
        if card.key == "savings_mix":
            if mix is not None and mix not in EQUITY_SHARE:
                raise AppError(422, "validation_error", "Unknown mix")
            return value
        kind = FIELDS[card.key].kind
        if kind == "money" and card.per_month_to_year:
            try:
                return str(Decimal(value) * 12)
            except InvalidOperation as e:
                raise AppError(422, "invalid_fact", "Invalid value", "Enter an amount") from e
        return value

    async def answer(
        self, user_id: uuid.UUID, card_key: str, value: str | None, mix: str | None = None, request_id: str | None = None
    ) -> AnswerResult:
        chapter_key = CARD_CHAPTER.get(card_key)
        if chapter_key is None:
            raise AppError(404, "not_found", "Unknown card")
        before = await self.statuses(user_id)
        if not self.unlocked(before, chapter_key):
            raise AppError(409, "chapter_locked", "Finish Snapshot first", "Your score appears after the first chapter.")
        card = next(c for c in CHAPTER_BY_KEY[chapter_key].cards if c.key == card_key)
        facts = await self._facts(user_id)
        prior = facts.get("equity_holdings" if card_key == "savings_mix" else card_key)
        measured_before, _ = await self.measured(user_id)
        parsed = self._parse(card, value, mix)

        if card_key == "savings_mix":
            try:
                total = Decimal(parsed)
            except InvalidOperation as e:
                raise AppError(422, "invalid_fact", "Invalid value", "Enter an amount") from e
            if total < 0:
                raise AppError(422, "invalid_fact", "Invalid value", "The amount cannot be negative")
            if total > 0 and mix is None:
                raise AppError(422, "validation_error", "Say how it is mostly invested")
            await record_savings_mix(self.profile, user_id, total, mix, request_id)
        else:
            await self.profile.record_fact(user_id, card_key, parsed, source_type="USER_STATED", source_ref="journey",
                                           user_correction=True, request_id=request_id)  # fmt: skip
        if card_key == "age":  # same labelled planning assumptions as the quick score (retire 60, money lasts to 85, risk by age)
            await record_planning_assumptions(self.profile, user_id, int(parsed), request_id)
        await derive.refresh(self.profile, user_id, request_id)

        after = await self.statuses(user_id)
        measured_after, result = await self.measured(user_id)
        st_before = next(s for s in before if s.chapter.key == chapter_key)
        st_after = next(s for s in after if s.chapter.key == chapter_key)
        newly_complete = st_after.complete and not st_before.complete
        score = await self.scoring.compute(user_id, request_id) if newly_complete and result is not None else None

        prog = await self.progress(user_id)
        self._touch_week(prog)
        points: int | None = None
        badges: list[str] = []
        if prog.rewards_enabled:
            gained = POINTS["answer"] if prior is None else (POINTS["assumption"] if prior.source_type == "ESTIMATED" else 0)
            if newly_complete:
                gained += POINTS["chapter"]
            prog.points += gained
            points = gained
            badges = await self._award_badges(user_id, prog, after)
        prog.updated_at = _now()
        insight = self._insight(card_key, prior, parsed, result, await self.profile.raw_inputs(user_id))
        return AnswerResult(insight, measured_before, measured_after, chapter_key, newly_complete, score, points, badges)

    async def keep(self, user_id: uuid.UUID, card_key: str, request_id: str | None = None) -> AnswerResult:
        """'Keep it' on an assumed value: the same value, now the user's own."""
        f = await self.profile.current_fact(user_id, card_key)
        if f is None or f.source_type != "ESTIMATED":
            raise AppError(409, "not_assumed", "There is no assumption to keep here")
        return await self.answer(user_id, card_key, f.value, request_id=request_id)

    def _touch_week(self, prog: UserProgress) -> None:
        week = iso_week(_now())
        if prog.last_active_week != week:
            prog.active_weeks += 1  # a gap only pauses the count; it never goes back to zero
            prog.last_active_week = week

    async def _award_badges(self, user_id: uuid.UUID, prog: UserProgress, statuses: list[Status]) -> list[str]:
        have = {b["key"] for b in prog.badges}
        facts = await self._facts(user_id)
        done = {s.chapter.key for s in statuses if s.complete}
        earned = {
            "first_score": "snapshot" in done,
            "protected": all(
                k in facts and facts[k].source_type != "ESTIMATED" for k in ("health_cover_amount", "life_cover_amount")
            ),
            "tax_smart": "tax" in done,
            "fine_tuned": "finetune" in done,
            "full_picture": len(done) == len(CHAPTERS),
            "steady_4": prog.active_weeks >= 4,
        }
        new = [k for k, ok in earned.items() if ok and k not in have]
        if new:
            prog.badges = [*prog.badges, *({"key": k, "at": _now().isoformat()} for k in new)]
        return new

    def _insight(
        self, card_key: str, prior: Fact | None, value: str, r: MatrixScoreResult | None, raw: dict[str, Decimal | bool | None]
    ) -> str:
        """One true sentence about the user's own numbers, from the engine (never the LLM, never product advice)."""
        if prior is not None and prior.source_type == "ESTIMATED" and prior.value == value:
            return "Kept. It is now your own number, not my assumption."
        if card_key == "liquid_assets":
            cash, spend = raw.get("liquid_assets"), raw.get("monthly_expenses")
            if isinstance(cash, Decimal) and isinstance(spend, Decimal) and spend > 0:
                months = (cash / spend).quantize(Decimal("0.1"))
                return f"Your safety net would cover about {months} months of spending."
            return "Noted. That is your safety net."
        if r is None:
            return "Noted. Your score appears at the end of this chapter."
        fids = FACTORS_OF.get(card_key, ())
        by_id = {f.id: f for f in r.factors}
        for fid in fids:
            f = by_id.get(fid)
            if f is not None and f.status == "scored" and f.factor_score is not None:
                label = "none" if (f.band_label or "").strip() in ("0", "0%") else f.band_label
                band = f" ({label})" if label else ""
                return f"{FRIENDLY[fid]}: {f.factor_score}/10 for your age group{band}."
        for fid in fids:
            f = by_id.get(fid)
            if f is not None and f.status == "not_applicable":
                return f"Noted. {FRIENDLY[fid]} does not apply to you, so it is left out of your score."
        for fid in fids:
            f = by_id.get(fid)
            if f is not None and f.status == "missing":
                return f"Noted. {FRIENDLY[fid]} needs one more answer, coming up."
        return "Noted."

    # ------------------------------------------------------------------ weekly check-in and settings
    async def checkin(self, user_id: uuid.UUID) -> int | None:
        prog = await self.progress(user_id)
        week = iso_week(_now())
        if prog.last_checkin_week == week:
            raise AppError(409, "already_checked_in", "Already checked in this week")
        prog.last_checkin_week = week
        self._touch_week(prog)
        gained = None
        if prog.rewards_enabled:
            prog.points += POINTS["checkin"]
            gained = POINTS["checkin"]
            await self._award_badges(user_id, prog, await self.statuses(user_id))
        prog.updated_at = _now()
        return gained

    async def set_rewards(self, user_id: uuid.UUID, enabled: bool) -> UserProgress:
        prog = await self.progress(user_id)
        prog.rewards_enabled = enabled
        prog.updated_at = _now()
        return prog

    def checkin_due(self, prog: UserProgress, statuses: list[Status]) -> bool:
        """Offered in a week with no activity yet (so never right after answering), once Snapshot is done."""
        week = iso_week(_now())
        return statuses[0].complete and prog.last_active_week != week and prog.last_checkin_week != week
