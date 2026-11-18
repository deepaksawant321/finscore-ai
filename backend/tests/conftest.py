import os
import subprocess
import sys
import tempfile
import uuid
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import httpx
import psycopg2
import pytest
import pytest_asyncio
from sqlalchemy import text

BACKEND = Path(__file__).resolve().parent.parent
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret-123")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused/unused")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "X" * 43 + "=")

from app.config import Settings  # noqa: E402
from app.domains.governance.service import LEGAL_TEXT_VERSION  # noqa: E402
from app.infra.crypto import generate_key
from app.infra.db import make_engine, make_sessionmaker  # noqa: E402
from app.infra.mailer import MemoryMailer  # noqa: E402
from app.infra.ratelimit import limiter  # noqa: E402
from app.main import create_app  # noqa: E402


def alembic(url: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "DATABASE_URL": url}
    return subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, capture_output=True, text=True, check=False
    )


@pytest.fixture(scope="session")
def pg_server() -> Iterator[str]:
    """Real PostgreSQL. Uses TEST_DATABASE_ADMIN_URL if set (e.g. CI service), else an embedded server."""
    admin = os.environ.get("TEST_DATABASE_ADMIN_URL")
    if admin:
        yield admin
        return
    import pixeltable_pgserver as pg

    d = tempfile.mkdtemp(prefix="finscore-pg-")
    srv = pg.get_server(d)
    try:
        yield srv.get_uri()
    finally:
        srv.cleanup()


def make_db(admin_uri: str) -> str:
    name = f"t_{uuid.uuid4().hex[:10]}"
    conn = psycopg2.connect(admin_uri)
    conn.autocommit = True
    conn.cursor().execute(f'CREATE DATABASE "{name}"')
    conn.close()
    base = admin_uri.rsplit("/", 1)[0]
    return f"{base}/{name}".replace("postgresql://", "postgresql+asyncpg://")


@pytest.fixture(scope="session")
def db_url(pg_server: str) -> str:
    url = make_db(pg_server)
    res = alembic(url, "upgrade", "head")
    assert res.returncode == 0, res.stderr
    return url


@pytest.fixture(scope="session")
def settings(db_url: str) -> Settings:
    return Settings(
        _env_file=None,
        env="test",
        database_url=db_url,
        jwt_secret="test-secret-test-secret-test-secret-123",  # type: ignore[arg-type]
        data_encryption_key=generate_key(),  # type: ignore[arg-type]
        rate_limit_enabled=False,
        cors_origins=["http://localhost:3000"],
    )


@pytest_asyncio.fixture(scope="session")
async def engine(db_url: str):  # type: ignore[no-untyped-def]
    eng = make_engine(db_url)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def mailer(engine) -> MemoryMailer:  # type: ignore[no-untyped-def]
    return MemoryMailer()


@pytest_asyncio.fixture
async def app(settings: Settings, engine, mailer: MemoryMailer):  # type: ignore[no-untyped-def]
    async with engine.begin() as c:
        await c.execute(text("TRUNCATE users, audit_log, data_requests RESTART IDENTITY CASCADE"))
    limiter.reset()
    application = create_app(settings, mailer)
    application.state.sessionmaker = make_sessionmaker(engine)
    return application


@pytest_asyncio.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app, client=("203.0.113.9", 5000))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


PASSWORD = "Str0ngPassw0rd!"


def signup(email: str, password: str = PASSWORD) -> dict[str, object]:
    return {"email": email, "password": password, "accept_terms": True, "terms_version": LEGAL_TEXT_VERSION}


async def register_verified(client: httpx.AsyncClient, mailer: MemoryMailer, email: str = "a@example.com") -> None:
    r = await client.post("/api/v1/auth/register", json=signup(email))
    assert r.status_code == 202
    token = mailer.sent[-1].body.split("token=")[1].split()[0]
    r = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert r.status_code == 200


async def login(client: httpx.AsyncClient, email: str = "a@example.com", password: str = PASSWORD) -> httpx.Response:
    return await client.post("/api/v1/auth/login", json={"email": email, "password": password})
