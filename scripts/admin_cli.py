"""Operator commands (run from backend/ with its venv; reads backend/.env).

    python ../scripts/admin_cli.py grant-role <email> <support|compliance|admin|advisor|org_admin>
    python ../scripts/admin_cli.py revoke-role <email> <role>
    python ../scripts/admin_cli.py purge-due        # execute erasure requests whose cooling-off period has ended

Every action is written to the audit log. Role changes take effect on the user's next login (staff endpoints re-check the DB).
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import delete, select  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.domains.governance.service import audit  # noqa: E402
from app.domains.identity.models import ROLES, User, UserRole  # noqa: E402
from app.domains.privacy.service import PrivacyService  # noqa: E402
from app.infra.db import make_engine, make_sessionmaker  # noqa: E402


async def main(argv: list[str]) -> int:
    cfg = get_settings()
    engine = make_engine(cfg.database_url)
    sm = make_sessionmaker(engine)
    try:
        async with sm() as s:
            if argv[:1] == ["purge-due"]:
                done = await PrivacyService(s, cfg).purge_due()
                await s.commit()
                print(f"erased {len(done)} account(s)")
                return 0
            if len(argv) == 3 and argv[0] in ("grant-role", "revoke-role"):
                email, role = argv[1].strip().lower(), argv[2]
                if role not in ROLES:
                    print(f"unknown role; choose from {ROLES}")
                    return 2
                user = (await s.execute(select(User).where(User.email == email))).scalars().first()
                if user is None:
                    print("no such user")
                    return 1
                if argv[0] == "grant-role":
                    if role not in await _roles(s, user):
                        s.add(UserRole(user_id=user.id, role=role))
                else:
                    await s.execute(delete(UserRole).where(UserRole.user_id == user.id, UserRole.role == role))
                await audit(s, action=f"admin.{argv[0].replace('-', '_')}", entity_type="user", entity_id=str(user.id), meta={"role": role})
                await s.commit()
                print(f"{argv[0]} {role}: ok")
                return 0
        print(__doc__)
        return 2
    finally:
        await engine.dispose()


async def _roles(s, user):  # type: ignore[no-untyped-def]
    return list((await s.execute(select(UserRole.role).where(UserRole.user_id == user.id))).scalars().all())


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main(sys.argv[1:])))
