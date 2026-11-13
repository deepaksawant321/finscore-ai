import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.actions.service import ActionService, ActionView
from app.infra.ratelimit import rate_limit

router = APIRouter(tags=["actions"])
DEMO_WATERMARK = "DEMO ACTION LIST: NOT AN APPROVED ACTION LIBRARY"
Verb = Literal["accept", "skip", "snooze", "start", "complete", "reopen"]


class PriorityOut(BaseModel):
    impact: str
    financial_impact: str
    urgency: str
    ease: str
    confidence: str
    goal_alignment: str
    total: str


class ActionOut(BaseModel):
    id: uuid.UUID
    key: str
    title: str
    why: str
    cta: str
    pillar_id: str
    state: str
    allowed: list[str]
    priority: PriorityOut | None
    expected_score_change: str  # computed by the score engine for this user; points
    effort: str
    time_to_impact_weeks: int
    snoozed_until: datetime | None
    verified: bool
    official: bool
    watermark: str | None
    updated_at: datetime


class TransitionIn(BaseModel):
    days: int | None = Field(default=None, ge=1, le=90)


class TimelineItem(BaseModel):
    at: str
    kind: str
    title: str


def _out(v: ActionView) -> ActionOut:
    a = v.row
    bd = a.priority_breakdown
    return ActionOut(
        id=a.id, key=a.catalog_key, title=v.title, why=v.why, cta=v.cta, pillar_id=v.pillar, state=a.state, allowed=v.allowed,
        priority=PriorityOut(**bd) if bd else None, expected_score_change=format(a.expected_delta, "f"), effort=v.effort,
        time_to_impact_weeks=v.time_to_impact_weeks, snoozed_until=a.snoozed_until, verified=a.state == "verified",
        official=a.official, watermark=None if a.official else DEMO_WATERMARK, updated_at=a.updated_at,
    )  # fmt: skip


@router.get("/actions", response_model=list[ActionOut])
async def list_actions(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, include_closed: bool = False) -> list[ActionOut]:
    return [_out(v) for v in await ActionService(session, cfg).mine(p.user_id, include_closed)]


@router.post("/actions/refresh", response_model=list[ActionOut], dependencies=[Depends(rate_limit("actions", 30, 60))])
async def refresh_actions(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> list[ActionOut]:
    return [_out(v) for v in await ActionService(session, cfg).refresh(p.user_id, client.request_id)]


@router.post("/actions/{action_id}/{verb}", response_model=ActionOut)
async def transition(
    action_id: uuid.UUID,
    verb: Verb,
    p: PrincipalDep,
    session: SessionDep,
    cfg: SettingsDep,
    client: ClientDep,
    body: TransitionIn | None = None,
) -> ActionOut:
    v = await ActionService(session, cfg).transition(p.user_id, action_id, verb, body.days if body else None, client.request_id)
    return _out(v)


@router.get("/timeline", response_model=list[TimelineItem])
async def timeline(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep, limit: int = Query(30, ge=1, le=100)
) -> list[dict[str, str]]:
    return await ActionService(session, cfg).timeline(p.user_id, limit)
