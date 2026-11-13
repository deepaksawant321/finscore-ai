import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.models import EmailToken, User, UserRole, UserSession


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.s = session

    async def user_by_email(self, email: str) -> User | None:
        return (await self.s.execute(select(User).where(User.email == email))).scalars().first()

    async def user_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.s.get(User, user_id)

    async def add_user(self, user: User, roles: list[str]) -> User:
        self.s.add(user)
        await self.s.flush()
        for r in roles:
            self.s.add(UserRole(user_id=user.id, role=r))
        await self.s.flush()
        return user

    async def roles(self, user_id: uuid.UUID) -> list[str]:
        rows = await self.s.execute(select(UserRole.role).where(UserRole.user_id == user_id).order_by(UserRole.role))
        return list(rows.scalars().all())

    async def add_session(self, row: UserSession) -> UserSession:
        self.s.add(row)
        await self.s.flush()
        return row

    async def session_by_hash(self, token_hash: str) -> UserSession | None:
        q = select(UserSession).where(UserSession.token_hash == token_hash)
        return (await self.s.execute(q)).scalars().first()

    async def revoke_family(self, family_id: uuid.UUID, now: datetime) -> None:
        await self.s.execute(
            update(UserSession).where(UserSession.family_id == family_id, UserSession.revoked_at.is_(None)).values(revoked_at=now)
        )

    async def revoke_all_for_user(self, user_id: uuid.UUID, now: datetime) -> None:
        await self.s.execute(
            update(UserSession).where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None)).values(revoked_at=now)
        )

    async def active_sessions(self, user_id: uuid.UUID, now: datetime) -> list[UserSession]:
        q = (
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None), UserSession.expires_at > now)
            .order_by(UserSession.created_at.desc())
        )
        return list((await self.s.execute(q)).scalars().all())

    async def session_by_id(self, session_id: uuid.UUID) -> UserSession | None:
        return await self.s.get(UserSession, session_id)

    async def add_email_token(self, row: EmailToken) -> None:
        self.s.add(row)
        await self.s.flush()

    async def email_token(self, token_hash: str, purpose: str) -> EmailToken | None:
        q = select(EmailToken).where(EmailToken.token_hash == token_hash, EmailToken.purpose == purpose)
        return (await self.s.execute(q)).scalars().first()
