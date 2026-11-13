import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.simulation.models import Simulation
from app.domains.simulation.service import SimulationService
from app.domains.simulation.specs import ScenarioSpec
from app.infra.ratelimit import rate_limit

router = APIRouter(prefix="/simulations", tags=["simulations"])
DEMO_WATERMARK = "DEMO RULES — NOT AN OFFICIAL FINSCORE"


class SimulationOut(BaseModel):
    id: uuid.UUID
    kind: str
    scenario: dict[str, object]
    result: dict[str, object]
    official: bool
    watermark: str | None
    rulebook_version: str
    engine_version: str
    created_at: datetime


def _out(x: Simulation) -> SimulationOut:
    return SimulationOut(
        id=x.id, kind=x.kind, scenario=x.scenario, result=x.result, official=x.official,
        watermark=None if x.official else DEMO_WATERMARK, rulebook_version=x.rulebook_version, engine_version=x.engine_version,
        created_at=x.created_at,
    )  # fmt: skip


@router.post("", response_model=SimulationOut, status_code=201, dependencies=[Depends(rate_limit("simulate", 30, 60))])
async def run(body: ScenarioSpec, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> SimulationOut:
    return _out(await SimulationService(session, cfg).run(p.user_id, body, client.request_id))


@router.get("", response_model=list[SimulationOut])
async def list_runs(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep, limit: int = Query(20, ge=1, le=50)
) -> list[SimulationOut]:
    return [_out(x) for x in await SimulationService(session, cfg).list(p.user_id, limit)]


@router.get("/{sim_id}", response_model=SimulationOut)
async def get_run(sim_id: uuid.UUID, p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> SimulationOut:
    return _out(await SimulationService(session, cfg).get(p.user_id, sim_id))
