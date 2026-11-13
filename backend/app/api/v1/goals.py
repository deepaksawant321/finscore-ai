import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.deps import ClientDep, PrincipalDep, SessionDep
from app.api.v1 import schemas_gov as g
from app.domains.goals.models import Goal
from app.domains.goals.service import GoalService, funding_view
from app.engines.money import round_money

router = APIRouter(tags=["goals"])


def f(d: Decimal) -> str:
    return format(round_money(d), "f")


def _out(x: Goal) -> g.GoalOut:
    return g.GoalOut(
        id=x.id, name=x.name, target_amount_today=format(round_money(x.target_amount_today), "f"), target_date=x.target_date, priority=x.priority,
        current_funding=format(round_money(x.current_funding), "f"), monthly_funding=format(round_money(x.monthly_funding), "f"), status=x.status, source=x.source,
    )  # fmt: skip


@router.get("/goals", response_model=list[g.GoalOut])
async def list_goals(p: PrincipalDep, session: SessionDep, include_archived: bool = False) -> list[g.GoalOut]:
    return [_out(x) for x in await GoalService(session).list(p.user_id, include_archived)]


@router.post("/goals", response_model=g.GoalOut, status_code=201)
async def create_goal(body: g.GoalIn, p: PrincipalDep, session: SessionDep, client: ClientDep) -> g.GoalOut:
    x = await GoalService(session).create(
        p.user_id, body.name, body.target_amount_today, body.target_date, body.priority, body.current_funding, body.monthly_funding,
        client.request_id,
    )  # fmt: skip
    return _out(x)


@router.get("/goals/{goal_id}", response_model=g.GoalOut)
async def get_goal(goal_id: uuid.UUID, p: PrincipalDep, session: SessionDep) -> g.GoalOut:
    return _out(await GoalService(session).get(p.user_id, goal_id))


@router.patch("/goals/{goal_id}", response_model=g.GoalOut)
async def patch_goal(goal_id: uuid.UUID, body: g.GoalPatch, p: PrincipalDep, session: SessionDep, client: ClientDep) -> g.GoalOut:
    return _out(
        await GoalService(session).update(
            p.user_id, goal_id, body.model_dump(exclude_unset=True, exclude_none=True), client.request_id
        )
    )


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: uuid.UUID, p: PrincipalDep, session: SessionDep, client: ClientDep) -> Response:
    await GoalService(session).delete(p.user_id, goal_id, client.request_id)
    return Response(status_code=204)


@router.get("/goals/{goal_id}/funding", response_model=g.FundingOut)
async def goal_funding(
    goal_id: uuid.UUID, p: PrincipalDep, session: SessionDep,
    assumed_return_pct: Annotated[Decimal, Query(ge=0, le=30, description="Annual return you assume (required: no default is approved)")],
    inflation_pct: Annotated[Decimal, Query(ge=0, le=20, description="Annual inflation you assume (required)")],
) -> g.FundingOut:  # fmt: skip
    goal = await GoalService(session).get(p.user_id, goal_id)
    v = funding_view(goal, assumed_return_pct, inflation_pct)
    return g.FundingOut(
        months_remaining=v.months_remaining, future_target=f(v.future_target), projected_from_current=f(v.projected_from_current),
        projected_from_monthly=f(v.projected_from_monthly), projected_total=f(v.projected_total), shortfall=f(v.shortfall),
        required_monthly_additional=f(v.required_monthly_additional), funded_ratio=format(v.funded_ratio, "f"), assumptions=list(v.assumptions),
    )  # fmt: skip
