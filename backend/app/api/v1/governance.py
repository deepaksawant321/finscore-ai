import json
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import ClientDep, IdentityDep, Principal, PrincipalDep, SessionDep, SettingsDep
from app.api.v1 import schemas_gov as g
from app.domains.governance import escalation as esc
from app.domains.governance.advice import POLICY_STATUS
from app.domains.governance.models import Escalation
from app.domains.interview.service import DISCLOSURE, InterviewService
from app.domains.privacy.service import PrivacyService
from app.infra.errors import AppError
from app.infra.ratelimit import rate_limit

router = APIRouter(tags=["governance"])


def _esc(e: Escalation) -> g.EscalationOut:
    return g.EscalationOut(
        id=e.id, reason=e.reason, status=e.status, created_at=e.created_at, sla_due_at=e.sla_due_at, resolved_at=e.resolved_at,
        note=e.note, resolution_note=e.resolution_note,
    )  # fmt: skip


def _staff_esc(e: Escalation) -> g.StaffEscalationOut:
    return g.StaffEscalationOut(**_esc(e).model_dump(), user_id=e.user_id, assigned_to=e.assigned_to)


async def staff_principal(p: PrincipalDep, svc: IdentityDep) -> Principal:
    """Staff roles are re-read from the database on every request (a token can outlive a role change)."""
    roles = set(await svc.roles(p.user_id))
    if not roles & set(esc.STAFF_ROLES):
        raise AppError(403, "forbidden", "Insufficient permissions")
    return p


StaffDep = Annotated[Principal, Depends(staff_principal)]


@router.get("/ai/disclosure")
async def disclosure() -> dict[str, str]:
    return {"disclosure": DISCLOSURE, "advice_policy": POLICY_STATUS}


# ---------------- user escalations ----------------
@router.post(
    "/escalations", response_model=g.EscalationOut, status_code=201, dependencies=[Depends(rate_limit("escalate", 10, 3600))]
)
async def create_escalation(body: g.EscalationCreate, p: PrincipalDep, session: SessionDep, client: ClientDep) -> g.EscalationOut:
    if body.conversation_id is not None:
        await InterviewService(session, None).assert_owner(p.user_id, body.conversation_id)
    e = await esc.create_escalation(session, p.user_id, body.reason, body.note, body.conversation_id, client.request_id)
    return _esc(e)


@router.get("/escalations", response_model=list[g.EscalationOut])
async def my_escalations(p: PrincipalDep, session: SessionDep) -> list[g.EscalationOut]:
    return [_esc(e) for e in await esc.list_own(session, p.user_id)]


@router.get("/escalations/{esc_id}", response_model=g.EscalationOut)
async def my_escalation(esc_id: uuid.UUID, p: PrincipalDep, session: SessionDep) -> g.EscalationOut:
    return _esc(await esc.get_own(session, p.user_id, esc_id))


# ---------------- staff ----------------
@router.get("/admin/escalations", response_model=list[g.StaffEscalationOut])
async def staff_queue(
    p: StaffDep, session: SessionDep, client: ClientDep, status: Annotated[str | None, Query()] = None
) -> list[g.StaffEscalationOut]:
    rows = await esc.staff_queue(session, status)
    for e in rows:  # reading users' notes is audited per item
        await esc.audit_staff_view(session, p.user_id, e.id, client.request_id)
    return [_staff_esc(e) for e in rows]


@router.patch("/admin/escalations/{esc_id}", response_model=g.StaffEscalationOut)
async def staff_update(
    esc_id: uuid.UUID, body: g.StaffEscalationPatch, p: StaffDep, session: SessionDep, client: ClientDep
) -> g.StaffEscalationOut:
    e = await esc.staff_update(
        session, p.user_id, esc_id, body.status, body.assign_to_me, body.resolution_note, client.request_id
    )
    return _staff_esc(e)


# ---------------- privacy: export & erasure ----------------
@router.get("/users/me/data-export", dependencies=[Depends(rate_limit("export", 5, 3600))])
async def data_export(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> Response:
    bundle = await PrivacyService(session, cfg).export_bundle(p.user_id, client.request_id)
    stamp = datetime.now(UTC).strftime("%Y%m%d")
    return Response(
        content=json.dumps(bundle, indent=2, ensure_ascii=False), media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="finscore-data-export-{stamp}.json"', "Cache-Control": "no-store"},
    )  # fmt: skip


@router.get("/users/me/erasure-request", response_model=g.ErasureStatusOut)
async def erasure_status(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> g.ErasureStatusOut:
    req = await PrivacyService(session, cfg).pending_erasure(p.user_id)
    return g.ErasureStatusOut(
        pending=req is not None, scheduled_for=req.scheduled_for if req else None, requested_at=req.requested_at if req else None
    )


@router.post(
    "/users/me/erasure-request",
    response_model=g.ErasureStatusOut,
    status_code=202,
    dependencies=[Depends(rate_limit("erasure", 5, 3600))],
)
async def request_erasure(
    body: g.ErasureRequestIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep
) -> g.ErasureStatusOut:
    req = await PrivacyService(session, cfg).request_erasure(p.user_id, body.password, client.request_id)
    return g.ErasureStatusOut(pending=True, scheduled_for=req.scheduled_for, requested_at=req.requested_at)


@router.delete("/users/me/erasure-request", status_code=204)
async def cancel_erasure(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> Response:
    await PrivacyService(session, cfg).cancel_erasure(p.user_id, client.request_id)
    return Response(status_code=204)
