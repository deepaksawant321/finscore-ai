import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.nudges.models import NotificationPref, Nudge
from app.domains.nudges.rules import RULES
from app.domains.nudges.service import NudgeService
from app.infra.ratelimit import rate_limit

router = APIRouter(tags=["nudges"])


class NudgeOut(BaseModel):
    id: uuid.UUID
    rule: str
    priority: str
    title: str
    body: str  # always includes why this is shown
    cta_label: str
    cta_path: str
    state: str
    created_at: datetime


class ReactIn(BaseModel):
    action: Literal["seen", "dismiss", "done", "snooze"]
    days: int | None = Field(default=None, ge=1, le=90)


class PrefsIn(BaseModel):
    in_app_enabled: bool
    max_active: int = Field(ge=1, le=10)
    muted_rules: list[str] = Field(default_factory=list, max_length=20)


class PrefsOut(PrefsIn):
    available_rules: list[str]


def _out(n: Nudge) -> NudgeOut:
    return NudgeOut(id=n.id, rule=n.rule_key, priority=n.priority, title=n.title, body=n.body, cta_label=n.cta_label,
                    cta_path=n.cta_path, state=n.state, created_at=n.created_at)  # fmt: skip


def _prefs(p: NotificationPref) -> PrefsOut:
    return PrefsOut(
        in_app_enabled=p.in_app_enabled, max_active=p.max_active, muted_rules=list(p.muted_rules), available_rules=list(RULES)
    )


@router.get("/nudges", response_model=list[NudgeOut])
async def list_nudges(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> list[NudgeOut]:
    return [_out(n) for n in await NudgeService(session, cfg).visible(p.user_id)]


@router.post("/nudges/refresh", response_model=list[NudgeOut], dependencies=[Depends(rate_limit("nudges", 30, 60))])
async def refresh(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> list[NudgeOut]:
    return [_out(n) for n in await NudgeService(session, cfg).refresh(p.user_id, client.request_id)]


@router.patch("/nudges/{nudge_id}", response_model=NudgeOut)
async def react(
    nudge_id: uuid.UUID, body: ReactIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep
) -> NudgeOut:
    return _out(await NudgeService(session, cfg).react(p.user_id, nudge_id, body.action, body.days, client.request_id))


@router.get("/notification-prefs", response_model=PrefsOut)
async def get_prefs(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> PrefsOut:
    return _prefs(await NudgeService(session, cfg).prefs(p.user_id))


@router.put("/notification-prefs", response_model=PrefsOut)
async def put_prefs(body: PrefsIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> PrefsOut:
    return _prefs(
        await NudgeService(session, cfg).set_prefs(
            p.user_id, body.in_app_enabled, body.max_active, body.muted_rules, client.request_id
        )
    )
