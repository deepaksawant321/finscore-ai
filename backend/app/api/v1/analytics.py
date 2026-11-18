"""First-party product analytics and browser error reports (audit Phase 1 item 1.11). No third party receives anything."""

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field

from app.api.deps import OptionalPrincipalDep, SessionDep
from app.api.v1.governance import StaffDep
from app.domains.analytics import service as analytics
from app.infra.ratelimit import rate_limit

router = APIRouter(tags=["analytics"])
log = structlog.get_logger()


class EventIn(BaseModel):
    name: str = Field(max_length=60)
    props: dict[str, str] | None = Field(default=None, max_length=8)
    path: str | None = Field(default=None, max_length=400)
    anon_id: str | None = Field(default=None, max_length=40)


class ClientErrorIn(BaseModel):
    message: str = Field(max_length=500)
    path: str | None = Field(default=None, max_length=400)
    source: str | None = Field(default=None, max_length=40)  # window_error | unhandled_rejection | boundary
    stack: str | None = Field(default=None, max_length=4000)


class FunnelRow(BaseModel):
    name: str
    events: int
    people: int


@router.post("/events", status_code=204, dependencies=[Depends(rate_limit("events", 240, 60))])
async def track(body: EventIn, p: OptionalPrincipalDep, session: SessionDep) -> Response:
    """Unknown event names and unsafe properties are dropped silently, so a bad client cannot fill the table with free text."""
    await analytics.record(session, body.name, p.user_id if p else None, body.anon_id, body.path, dict(body.props or {}))
    return Response(status_code=204)


@router.post("/client-errors", status_code=204, dependencies=[Depends(rate_limit("client-errors", 30, 60))])
async def client_error(body: ClientErrorIn, p: OptionalPrincipalDep) -> Response:
    """Browser errors go to the server log (scrubbed of emails and tokens by the log pipeline), where alerting can pick them up."""
    log.error(
        "client_error", message=body.message, path=analytics.clean_path(body.path), source=body.source,
        stack=(body.stack or "")[:4000], signed_in=p is not None,
    )  # fmt: skip
    return Response(status_code=204)


@router.get("/admin/funnel", response_model=list[FunnelRow])
async def funnel(_: StaffDep, session: SessionDep, days: Annotated[int, Query(ge=1, le=365)] = 30) -> list[FunnelRow]:
    """Staff only: event counts and distinct people per step, funnel steps first."""
    return [FunnelRow(name=n, events=e, people=d) for n, e, d in await analytics.funnel(session, days)]
