"""Money Map: the interview as chapters of tap-to-answer cards, with instant facts and optional rewards."""

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.api.v1.matrix_score import MatrixScoreOut, matrix_out
from app.domains.journey.chapters import CHAPTER_BY_KEY, Card
from app.domains.journey.models import UserProgress
from app.domains.journey.service import BADGES, JourneyService, Status
from app.domains.profile.catalog import FIELDS
from app.infra.errors import AppError
from app.infra.ratelimit import rate_limit

router = APIRouter(prefix="/journey", tags=["journey"])
MIXES = [("mostly_safe", "Mostly FDs & savings"), ("balanced", "A mix"), ("mostly_equity", "Mostly stocks & equity funds")]


class Chip(BaseModel):
    label: str
    value: str


class Option(BaseModel):
    key: str
    label: str


class CardOut(BaseModel):
    key: str
    chapter: str
    prompt: str
    why: str
    kind: Literal["money", "int", "bool", "choice", "savings_mix"]
    unit: str | None
    chips: list[Chip]
    choices: list[str]
    mixes: list[Option] = Field(description="For kind=savings_mix: how the savings are mostly invested")
    per_month: bool = Field(description="The amount is per month (stored per year)")
    assumed_value: str | None = Field(description="Set when the current value is an assumption the user can keep or change")
    unsure_ok: bool


class ChapterOut(BaseModel):
    key: str
    title: str
    blurb: str
    done: int
    total: int
    complete: bool
    unlocked: bool


class BadgeOut(BaseModel):
    key: str
    label: str
    at: str | None = None


class ProgressOut(BaseModel):
    points: int
    badges: list[BadgeOut]
    active_weeks: int
    active_this_week: bool


class JourneyOut(BaseModel):
    chapters: list[ChapterOut]
    measured: str = Field(description="Share of the score that can be measured from the answers so far (0-1)")
    next: CardOut | None
    rewards_enabled: bool
    progress: ProgressOut | None = Field(description="Omitted when the user switched rewards off")
    checkin_due: bool


class AnswerIn(BaseModel):
    card: str = Field(max_length=40)
    value: str | None = Field(default=None, max_length=40)
    mix: Literal["mostly_safe", "balanced", "mostly_equity"] | None = None


class KeepIn(BaseModel):
    card: str = Field(max_length=40)


class AnswerOut(BaseModel):
    insight: str
    measured_before: str
    measured_after: str
    chapter: str
    chapter_complete: bool
    score: MatrixScoreOut | None = Field(description="Set when this answer completed a chapter")
    points_awarded: int | None
    new_badges: list[BadgeOut]
    next: CardOut | None = Field(description="The next card in the same chapter, if any")


class CheckinOut(BaseModel):
    points_awarded: int | None


class SettingsIn(BaseModel):
    rewards_enabled: bool


def _card(card: Card, chapter: str, assumed: str | None) -> CardOut:
    if card.key == "savings_mix":
        return CardOut(key=card.key, chapter=chapter, prompt=card.prompt or "", why="Your savings and how they are invested shape "
                       "your assets, net worth and investment mix.", kind="savings_mix", unit="INR", chips=[Chip(label=a, value=b)
                       for a, b in card.chips], choices=[], mixes=[Option(key=k, label=v) for k, v in MIXES], per_month=False,
                       assumed_value=None, unsure_ok=card.unsure_ok)  # fmt: skip
    f = FIELDS[card.key]
    return CardOut(key=card.key, chapter=chapter, prompt=card.prompt or f.question, why=f.why, kind=f.kind, unit=f.unit,
                   chips=[Chip(label=a, value=b) for a, b in card.chips], choices=list(f.choices), mixes=[],
                   per_month=card.per_month_to_year, assumed_value=assumed, unsure_ok=card.unsure_ok)  # fmt: skip


async def _next(
    svc: JourneyService, p: PrincipalDep, statuses: list[Status], skipped: set[str], chapter: str | None
) -> CardOut | None:
    facts = {f.field_key: f for f in await svc.profile.current_facts(p.user_id)}
    for st in statuses:
        if (chapter and st.chapter.key != chapter) or not svc.unlocked(statuses, st.chapter.key):
            continue
        for c in st.todo:
            if c.key in skipped:
                continue
            f = facts.get(c.key)
            return _card(c, st.chapter.key, f.value if f is not None and f.source_type == "ESTIMATED" else None)
    return None


def _progress(prog: UserProgress) -> ProgressOut:
    from app.domains.journey.service import _now, iso_week

    return ProgressOut(
        points=prog.points, badges=[BadgeOut(key=b["key"], label=BADGES.get(b["key"], b["key"]), at=b.get("at")) for b in prog.badges],
        active_weeks=prog.active_weeks, active_this_week=prog.last_active_week == iso_week(_now()),
    )  # fmt: skip


def _skipped(raw: str | None) -> set[str]:
    return {s for s in (raw or "").split(",") if s}


@router.get("", response_model=JourneyOut)
async def overview(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep,
    skipped: str | None = Query(default=None, max_length=500, description="Comma-separated cards the user put off for now"),
    chapter: str | None = Query(default=None, max_length=20),
) -> JourneyOut:  # fmt: skip
    if chapter is not None and chapter not in CHAPTER_BY_KEY:
        raise AppError(404, "not_found", "Unknown chapter")
    svc = JourneyService(session, cfg)
    statuses = await svc.statuses(p.user_id)
    measured, _ = await svc.measured(p.user_id)
    prog = await svc.progress(p.user_id)
    return JourneyOut(
        chapters=[ChapterOut(key=s.chapter.key, title=s.chapter.title, blurb=s.chapter.blurb, done=s.done, total=s.total,
                             complete=s.complete, unlocked=svc.unlocked(statuses, s.chapter.key)) for s in statuses],
        measured=format(measured.quantize(Decimal("0.0001")), "f"),
        next=await _next(svc, p, statuses, _skipped(skipped), chapter),
        rewards_enabled=prog.rewards_enabled, progress=_progress(prog) if prog.rewards_enabled else None,
        checkin_due=svc.checkin_due(prog, statuses),
    )  # fmt: skip


async def _answer_out(svc: JourneyService, p: PrincipalDep, r, skipped: set[str]) -> AnswerOut:  # type: ignore[no-untyped-def]
    statuses = await svc.statuses(p.user_id)
    return AnswerOut(
        insight=r.insight, measured_before=format(r.measured_before.quantize(Decimal("0.0001")), "f"),
        measured_after=format(r.measured_after.quantize(Decimal("0.0001")), "f"), chapter=r.chapter,
        chapter_complete=r.chapter_complete, score=matrix_out(r.score) if r.score else None, points_awarded=r.points_awarded,
        new_badges=[BadgeOut(key=k, label=BADGES[k]) for k in r.new_badges],
        next=await _next(svc, p, statuses, skipped, r.chapter),
    )  # fmt: skip


@router.post("/answer", response_model=AnswerOut, dependencies=[Depends(rate_limit("journey", 120, 60))])
async def answer(
    body: AnswerIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep,
    skipped: str | None = Query(default=None, max_length=500),
) -> AnswerOut:  # fmt: skip
    svc = JourneyService(session, cfg)
    r = await svc.answer(p.user_id, body.card, body.value, body.mix, client.request_id)
    return await _answer_out(svc, p, r, _skipped(skipped))


@router.post("/keep", response_model=AnswerOut, dependencies=[Depends(rate_limit("journey", 120, 60))])
async def keep(
    body: KeepIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep,
    skipped: str | None = Query(default=None, max_length=500),
) -> AnswerOut:  # fmt: skip
    svc = JourneyService(session, cfg)
    r = await svc.keep(p.user_id, body.card, client.request_id)
    return await _answer_out(svc, p, r, _skipped(skipped))


@router.post("/checkin", response_model=CheckinOut)
async def checkin(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> CheckinOut:
    return CheckinOut(points_awarded=await JourneyService(session, cfg).checkin(p.user_id))


@router.put("/settings", response_model=JourneyOut)
async def settings(body: SettingsIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> JourneyOut:
    await JourneyService(session, cfg).set_rewards(p.user_id, body.rewards_enabled)
    return await overview(p, session, cfg, skipped=None, chapter=None)
