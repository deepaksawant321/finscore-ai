from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response

from app.api.deps import ClientDep, IdentityDep, SettingsDep
from app.config import Settings
from app.domains.identity.schemas import (
    ForgotIn,
    LoginIn,
    RegisterIn,
    ResetIn,
    StatusOut,
    TokenOut,
    VerifyEmailIn,
)
from app.domains.identity.service import Issued
from app.infra.errors import AppError
from app.infra.ratelimit import enforce, rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "fs_refresh"
COOKIE_PATH = "/api/v1/auth"


def _per_email(request: Request, name: str, email: str, limit: int, window: int) -> None:
    """Per-account limit on top of the per-address one: changing address does not buy more attempts at one account."""
    enforce(request, f"{name}-email:{email.strip().lower()}", limit, window)


def _set_cookie(resp: Response, token: str, cfg: Settings) -> None:
    resp.set_cookie(
        COOKIE,
        token,
        max_age=cfg.refresh_ttl_days * 86400,
        httponly=True,
        secure=cfg.cookie_secure,
        samesite="lax",
        path=COOKIE_PATH,
    )


def _check_origin(request: Request, cfg: Settings) -> None:
    """CSRF defence for cookie-authenticated endpoints: if an Origin header is sent it must be allow-listed."""
    origin = request.headers.get("origin")
    if origin and origin not in cfg.cors_origins:
        raise AppError(403, "forbidden", "Origin not allowed")


def _out(issued: Issued, resp: Response, cfg: Settings) -> TokenOut:
    _set_cookie(resp, issued.refresh_token, cfg)
    resp.headers["Cache-Control"] = "no-store"
    return TokenOut(access_token=issued.access_token, expires_in=issued.expires_in)


@router.post("/register", status_code=202, response_model=StatusOut, dependencies=[Depends(rate_limit("register", 10, 3600))])
async def register(request: Request, body: RegisterIn, svc: IdentityDep, client: ClientDep) -> StatusOut:
    _per_email(request, "register", body.email, 3, 3600)
    await svc.register(body.email, body.password, body.full_name, client)
    return StatusOut(status="verification_sent")


@router.post("/verify-email", response_model=StatusOut, dependencies=[Depends(rate_limit("verify", 20, 3600))])
async def verify_email(body: VerifyEmailIn, svc: IdentityDep, client: ClientDep) -> StatusOut:
    await svc.verify_email(body.token, client)
    return StatusOut(status="verified")


@router.post("/login", response_model=TokenOut, dependencies=[Depends(rate_limit("login", 10, 60))])
async def login(
    request: Request, body: LoginIn, response: Response, svc: IdentityDep, client: ClientDep, cfg: SettingsDep
) -> TokenOut:
    _per_email(request, "login", body.email, 10, 300)
    return _out(await svc.login(body.email, body.password, client), response, cfg)


@router.post("/refresh", response_model=TokenOut, dependencies=[Depends(rate_limit("refresh", 60, 60))])
async def refresh(
    request: Request,
    response: Response,
    svc: IdentityDep,
    client: ClientDep,
    cfg: SettingsDep,
    fs_refresh: Annotated[str | None, Cookie()] = None,
) -> TokenOut:
    _check_origin(request, cfg)
    if not fs_refresh:
        raise AppError(401, "invalid_refresh", "Missing refresh token")
    return _out(await svc.refresh(fs_refresh, client), response, cfg)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    svc: IdentityDep,
    cfg: SettingsDep,
    fs_refresh: Annotated[str | None, Cookie()] = None,
) -> None:
    _check_origin(request, cfg)
    await svc.logout(fs_refresh)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)


@router.post("/password/forgot", status_code=202, response_model=StatusOut, dependencies=[Depends(rate_limit("forgot", 5, 3600))])
async def forgot(request: Request, body: ForgotIn, svc: IdentityDep) -> StatusOut:
    _per_email(request, "forgot", body.email, 3, 3600)
    await svc.forgot_password(body.email)
    return StatusOut(status="if_account_exists_email_sent")


@router.post("/password/reset", response_model=StatusOut, dependencies=[Depends(rate_limit("reset", 10, 3600))])
async def reset(body: ResetIn, svc: IdentityDep, client: ClientDep) -> StatusOut:
    await svc.reset_password(body.token, body.new_password, client)
    return StatusOut(status="password_reset")
