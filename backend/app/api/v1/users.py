import uuid

from fastapi import APIRouter, Response

from app.api.deps import IdentityDep, PrincipalDep, SessionDep
from app.domains.governance import service as gov
from app.domains.identity.schemas import ConsentIn, ConsentOut, SessionOut, UserOut, UserPatch

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
async def me(p: PrincipalDep, svc: IdentityDep) -> UserOut:
    user = await svc.get_user(p.user_id)
    out = UserOut.model_validate(user)
    out.roles = await svc.roles(user.id)
    return out


@router.patch("/users/me", response_model=UserOut)
async def patch_me(body: UserPatch, p: PrincipalDep, svc: IdentityDep) -> UserOut:
    user = await svc.get_user(p.user_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(user, k, v)
    out = UserOut.model_validate(user)
    out.roles = await svc.roles(user.id)
    return out


@router.get("/users/me/sessions", response_model=list[SessionOut])
async def sessions(p: PrincipalDep, svc: IdentityDep) -> list[SessionOut]:
    rows = await svc.list_sessions(p.user_id)
    return [
        SessionOut(
            id=r.id,
            created_at=r.created_at,
            expires_at=r.expires_at,
            user_agent=r.user_agent,
            ip=r.ip,
            current=(r.id == p.session_id),
        )
        for r in rows
    ]


@router.delete("/users/me/sessions/{session_id}", status_code=204)
async def revoke_session(session_id: uuid.UUID, p: PrincipalDep, svc: IdentityDep) -> Response:
    await svc.revoke_session(p.user_id, session_id)
    return Response(status_code=204)


@router.get("/consents", response_model=list[ConsentOut])
async def list_consents(p: PrincipalDep, session: SessionDep) -> list[ConsentOut]:
    return [ConsentOut.model_validate(c) for c in await gov.list_consents(session, p.user_id)]


@router.post("/consents", response_model=ConsentOut, status_code=201)
async def grant(body: ConsentIn, p: PrincipalDep, session: SessionDep) -> ConsentOut:
    c = await gov.grant_consent(session, p.user_id, body.purpose, body.text_version, body.scope)
    return ConsentOut.model_validate(c)


@router.delete("/consents/{purpose}", status_code=204)
async def revoke(purpose: str, p: PrincipalDep, session: SessionDep) -> Response:
    await gov.revoke_consent(session, p.user_id, purpose)
    return Response(status_code=204)
