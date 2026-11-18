import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.governance.service import LEGAL_TEXT_VERSION, audit, grant_consent
from app.domains.identity.models import EmailToken, User, UserSession
from app.domains.identity.repository import IdentityRepository
from app.infra.errors import AppError
from app.infra.mailer import Mail, Mailer
from app.infra.security import (
    create_access_token,
    hash_password,
    hash_token,
    needs_rehash,
    new_opaque_token,
    verify_password,
)


@dataclass
class ClientInfo:
    ip: str | None
    user_agent: str | None
    request_id: str | None


@dataclass
class Issued:
    access_token: str
    refresh_token: str
    expires_in: int


def _now() -> datetime:
    return datetime.now(UTC)


def normalise_email(email: str) -> str:
    return email.strip().lower()


class IdentityService:
    def __init__(self, session: AsyncSession, settings: Settings, mailer: Mailer) -> None:
        self.session, self.cfg, self.mailer = session, settings, mailer
        self.repo = IdentityRepository(session)

    # ---------- registration & email tokens ----------
    async def _send_token_mail(self, user: User, purpose: str, path: str, subject: str, intro: str) -> None:
        raw = new_opaque_token()
        await self.repo.add_email_token(
            EmailToken(
                user_id=user.id,
                purpose=purpose,
                token_hash=hash_token(raw),
                expires_at=_now() + timedelta(minutes=self.cfg.email_token_ttl_minutes),
            )
        )
        link = f"{self.cfg.frontend_url}/{path}?token={raw}"
        await self.mailer.send(Mail(to=user.email, subject=subject, body=f"{intro}\n\n{link}\n\nThis link expires soon."))

    async def register(
        self, email: str, password: str, full_name: str | None, client: ClientInfo, terms_version: str = LEGAL_TEXT_VERSION
    ) -> None:
        """Enumeration-safe: caller always gets the same response whether or not the email exists.
        The accepted Terms/Privacy version is recorded as the core_processing consent (DPDP notice and consent)."""
        if terms_version != LEGAL_TEXT_VERSION:
            raise AppError(409, "terms_outdated", "The terms have been updated", "Please reload the page and review them again.")
        email = normalise_email(email)
        existing = await self.repo.user_by_email(email)
        if existing:
            await self.mailer.send(
                Mail(
                    to=email,
                    subject="5nance FinScore: account already exists",
                    body="Someone tried to register with this email. If it was you, please log in or reset your password.",
                )
            )
            return
        user = await self.repo.add_user(
            User(email=email, password_hash=hash_password(password), full_name=full_name), roles=["user"]
        )
        await grant_consent(self.session, user.id, "core_processing", terms_version, None)
        await audit(
            self.session,
            action="user.registered",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip=client.ip,
            request_id=client.request_id,
        )
        await self._send_token_mail(
            user,
            "verify",
            "verify-email",
            "Verify your 5nance FinScore email",
            "Welcome to FinScore AI. Please verify your email:",
        )

    async def verify_email(self, token: str, client: ClientInfo) -> None:
        row = await self.repo.email_token(hash_token(token), "verify")
        if not row or row.used_at or row.expires_at < _now():
            raise AppError(400, "invalid_token", "Invalid or expired token")
        user = await self.repo.user_by_id(row.user_id)
        if not user:
            raise AppError(400, "invalid_token", "Invalid or expired token")
        row.used_at = _now()
        user.email_verified = True
        await audit(
            self.session,
            action="user.email_verified",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip=client.ip,
            request_id=client.request_id,
        )

    async def forgot_password(self, email: str) -> None:
        user = await self.repo.user_by_email(normalise_email(email))
        if user and user.status == "active":
            await self._send_token_mail(
                user, "reset", "reset-password", "Reset your 5nance FinScore password", "Use this link to choose a new password:"
            )

    async def reset_password(self, token: str, new_password: str, client: ClientInfo) -> None:
        row = await self.repo.email_token(hash_token(token), "reset")
        if not row or row.used_at or row.expires_at < _now():
            raise AppError(400, "invalid_token", "Invalid or expired token")
        user = await self.repo.user_by_id(row.user_id)
        if not user:
            raise AppError(400, "invalid_token", "Invalid or expired token")
        now = _now()
        row.used_at = now
        user.password_hash = hash_password(new_password)
        user.failed_logins, user.locked_until = 0, None
        await self.repo.revoke_all_for_user(user.id, now)
        await audit(
            self.session,
            action="user.password_reset",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip=client.ip,
            request_id=client.request_id,
        )

    # ---------- login / sessions ----------
    async def _issue(self, user: User, family_id: uuid.UUID, client: ClientInfo) -> Issued:
        raw = new_opaque_token()
        sess = await self.repo.add_session(
            UserSession(
                user_id=user.id,
                family_id=family_id,
                token_hash=hash_token(raw),
                expires_at=_now() + timedelta(days=self.cfg.refresh_ttl_days),
                user_agent=(client.user_agent or "")[:255] or None,
                ip=client.ip,
            )
        )
        roles = await self.repo.roles(user.id)
        access = create_access_token(
            secret=self.cfg.jwt_secret.get_secret_value(),
            issuer=self.cfg.jwt_issuer,
            user_id=user.id,
            session_id=sess.id,
            roles=roles,
            ttl_minutes=self.cfg.access_ttl_minutes,
        )
        return Issued(access, raw, self.cfg.access_ttl_minutes * 60)

    async def login(self, email: str, password: str, client: ClientInfo) -> Issued:
        user = await self.repo.user_by_email(normalise_email(email))
        now = _now()
        if user and user.locked_until and user.locked_until > now:
            verify_password(password, None)  # keep timing similar
            raise AppError(423, "account_locked", "Account temporarily locked", "Too many failed attempts.")
        ok = verify_password(password, user.password_hash if user else None)
        if not ok or user is None:
            if user:
                user.failed_logins += 1
                if user.failed_logins >= self.cfg.max_failed_logins:
                    user.locked_until = now + timedelta(minutes=self.cfg.lockout_minutes)
                    user.failed_logins = 0
                await audit(
                    self.session,
                    action="auth.login_failed",
                    entity_type="user",
                    entity_id=str(user.id),
                    actor_user_id=user.id,
                    ip=client.ip,
                    request_id=client.request_id,
                )
            await self.session.commit()  # persist counters/audit before raising
            raise AppError(401, "invalid_credentials", "Invalid email or password")
        if user.status != "active":
            raise AppError(403, "account_disabled", "Account disabled")
        if not user.email_verified:
            raise AppError(403, "email_not_verified", "Please verify your email before logging in")
        user.failed_logins, user.locked_until = 0, None
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        issued = await self._issue(user, uuid.uuid4(), client)
        await audit(
            self.session,
            action="auth.login",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip=client.ip,
            request_id=client.request_id,
        )
        return issued

    async def refresh(self, refresh_token: str, client: ClientInfo) -> Issued:
        now = _now()
        sess = await self.repo.session_by_hash(hash_token(refresh_token))
        if sess is None:
            raise AppError(401, "invalid_refresh", "Invalid refresh token")
        if sess.revoked_at is not None:
            # Reuse of a rotated/revoked token: assume theft, kill the whole family.
            await self.repo.revoke_family(sess.family_id, now)
            await audit(
                self.session,
                action="auth.refresh_reuse_detected",
                entity_type="user",
                entity_id=str(sess.user_id),
                actor_user_id=sess.user_id,
                ip=client.ip,
                request_id=client.request_id,
            )
            await self.session.commit()
            raise AppError(401, "refresh_reuse_detected", "Session revoked; please log in again")
        if sess.expires_at <= now:
            raise AppError(401, "invalid_refresh", "Refresh token expired")
        user = await self.repo.user_by_id(sess.user_id)
        if not user or user.status != "active":
            raise AppError(401, "invalid_refresh", "Invalid refresh token")
        sess.revoked_at = now
        return await self._issue(user, sess.family_id, client)

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        sess = await self.repo.session_by_hash(hash_token(refresh_token))
        if sess:
            await self.repo.revoke_family(sess.family_id, _now())

    async def list_sessions(self, user_id: uuid.UUID) -> list[UserSession]:
        return await self.repo.active_sessions(user_id, _now())

    async def revoke_session(self, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        sess = await self.repo.session_by_id(session_id)
        if not sess or sess.user_id != user_id:  # never reveal other users' sessions
            raise AppError(404, "not_found", "Session not found")
        await self.repo.revoke_family(sess.family_id, _now())

    # ---------- users ----------
    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.repo.user_by_id(user_id)
        if not user or user.status != "active":
            raise AppError(401, "unauthorized", "Unauthorized")
        return user

    async def roles(self, user_id: uuid.UUID) -> list[str]:
        return await self.repo.roles(user_id)
