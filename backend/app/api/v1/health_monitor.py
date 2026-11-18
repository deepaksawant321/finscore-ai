from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.health.service import HealthReport, HealthService
from app.engines.health import headline_status
from app.infra.ratelimit import rate_limit

router = APIRouter(prefix="/health-monitor", tags=["health-monitor"])
DEMO_WATERMARK = "DEMO THRESHOLDS: NOT APPROVED HEALTH RULES"


class VitalOut(BaseModel):
    key: str
    label: str
    status: str  # green | amber | red | unknown
    known: bool
    stale: bool
    value_display: str | None
    rule_text: str
    fact_age_days: int | None


class EventOut(BaseModel):
    vital: str
    label: str
    kind: str  # health_worse | health_better | newly_measured | went_stale | refreshed
    category: str  # health | data_quality
    from_status: str
    to_status: str
    message: str


class HealthOut(BaseModel):
    overall: str  # worst measured vital (stored in history, drives alerts)
    headline: str  # what to show first: "incomplete" instead of green while any vital is unmeasured
    measured: int
    total: int
    data_quality: str  # good | fair | poor: a separate verdict from the health status
    vitals: list[VitalOut]
    events: list[EventOut]
    official: bool
    watermark: str | None
    checked_at: datetime


class HistoryItem(BaseModel):
    taken_at: datetime
    overall: str
    data_quality: str
    official: bool


def _out(r: HealthReport) -> HealthOut:
    return HealthOut(
        overall=r.overall, headline=headline_status(r.overall, any(not v.known for v in r.vitals)), measured=sum(1 for v in r.vitals if v.known), total=len(r.vitals),
        data_quality=r.data_quality, official=r.official, watermark=None if r.official else DEMO_WATERMARK,
        checked_at=r.checked_at,
        vitals=[VitalOut(key=v.key, label=v.label, status=v.status, known=v.known, stale=v.stale, value_display=v.value_display,
                         rule_text=v.rule_text, fact_age_days=v.fact_age_days) for v in r.vitals],
        events=[EventOut(vital=e.vital, label=e.label, kind=e.kind, category="health" if e.kind in ("health_worse", "health_better") else "data_quality",
                         from_status=e.from_status, to_status=e.to_status, message=e.message) for e in r.events],
    )  # fmt: skip


@router.get("", response_model=HealthOut)
async def current(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> HealthOut:
    return _out(await HealthService(session, cfg).current(p.user_id))


@router.post("/check", response_model=HealthOut, dependencies=[Depends(rate_limit("health", 30, 60))])
async def check(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> HealthOut:
    return _out(await HealthService(session, cfg).check(p.user_id, client.request_id))


@router.get("/history", response_model=list[HistoryItem])
async def history(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep, limit: int = Query(20, ge=1, le=100)
) -> list[HistoryItem]:
    return [HistoryItem(taken_at=h.taken_at, overall=h.overall, data_quality=h.data_quality, official=h.official)
            for h in await HealthService(session, cfg).history(p.user_id, limit)]  # fmt: skip
