from sqlalchemy import create_engine, inspect

from tests.conftest import alembic, make_db


def test_migrations_up_down_up(pg_server: str) -> None:
    url = make_db(pg_server)
    assert alembic(url, "upgrade", "head").returncode == 0
    sync = create_engine(url.replace("+asyncpg", "+psycopg2"))
    tables = set(inspect(sync).get_table_names())
    assert {"users", "user_roles", "user_sessions", "email_tokens", "audit_log", "consents"} <= tables
    assert alembic(url, "downgrade", "base").returncode == 0
    assert set(inspect(sync).get_table_names()) <= {"alembic_version"}
    assert alembic(url, "upgrade", "head").returncode == 0
    # model/migration drift check: autogenerate must find nothing to change
    res = alembic(url, "check")
    assert res.returncode == 0, res.stdout + res.stderr
    sync.dispose()
