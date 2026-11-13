import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.copilot.service import CopilotReport, CopilotService
from app.infra.ratelimit import rate_limit

router = APIRouter(prefix="/copilot", tags=["copilot"])


class FindingOut(BaseModel):
    level: str  # ok | info | warning | blocker
    code: str
    message: str
    hand_off: bool  # true => this needs you or a qualified human, not the Copilot


class CopilotReportOut(BaseModel):
    context: str
    findings: list[FindingOut]
    needs_hand_off: bool


class GoalCheckIn(BaseModel):
    goal_id: uuid.UUID | None = None  # omit when checking a goal you have not created yet
    new_monthly_funding: Decimal = Field(ge=0, le=Decimal("1e9"))


def _out(r: CopilotReport) -> CopilotReportOut:
    return CopilotReportOut(
        context=r.context, needs_hand_off=r.needs_hand_off,
        findings=[FindingOut(level=f.level, code=f.code, message=f.message, hand_off=f.hand_off) for f in r.findings],
    )  # fmt: skip


@router.post("/actions/{action_id}/check", response_model=CopilotReportOut, dependencies=[Depends(rate_limit("copilot", 30, 60))])
async def check_action(
    action_id: uuid.UUID, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep
) -> CopilotReportOut:
    return _out(await CopilotService(session, cfg).check_action(p.user_id, action_id, client.request_id))


@router.post("/goals/check", response_model=CopilotReportOut, dependencies=[Depends(rate_limit("copilot", 30, 60))])
async def check_goal(
    body: GoalCheckIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep
) -> CopilotReportOut:
    return _out(
        await CopilotService(session, cfg).check_goal(p.user_id, body.new_monthly_funding, body.goal_id, client.request_id)
    )
