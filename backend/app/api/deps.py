import uuid
from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.identity.service import ClientInfo, IdentityService
from app.infra.db import get_session
from app.infra.errors import AppError
from app.infra.mailer import Mailer
from app.infra.security import decode_access_token

bearer = HTTPBearer(auto_error=False)
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


def get_mailer(request: Request) -> Mailer:
    return request.app.state.mailer  # type: ignore[no-any-return]


SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


def get_identity_service(
    session: SessionDep, settings: SettingsDep, mailer: Annotated[Mailer, Depends(get_mailer)]
) -> IdentityService:
    return IdentityService(session, settings, mailer)


IdentityDep = Annotated[IdentityService, Depends(get_identity_service)]


def client_info(request: Request) -> ClientInfo:
    return ClientInfo(
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=getattr(request.state, "request_id", None),
    )


ClientDep = Annotated[ClientInfo, Depends(client_info)]


@dataclass
class Principal:
    user_id: uuid.UUID
    session_id: uuid.UUID
    roles: list[str]


async def current_principal(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], settings: SettingsDep
) -> Principal:
    if creds is None:
        raise AppError(401, "unauthorized", "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    try:
        claims = decode_access_token(creds.credentials, secret=settings.jwt_secret.get_secret_value(), issuer=settings.jwt_issuer)
        return Principal(uuid.UUID(claims["sub"]), uuid.UUID(claims["sid"]), list(claims.get("roles", [])))
    except (jwt.PyJWTError, KeyError, ValueError) as e:
        raise AppError(401, "unauthorized", "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from e


PrincipalDep = Annotated[Principal, Depends(current_principal)]


def require_roles(*allowed: str) -> Callable[[Principal], Coroutine[Any, Any, Principal]]:
    async def dep(p: PrincipalDep) -> Principal:
        if not set(allowed) & set(p.roles):
            raise AppError(403, "forbidden", "Insufficient permissions")
        return p

    return dep
