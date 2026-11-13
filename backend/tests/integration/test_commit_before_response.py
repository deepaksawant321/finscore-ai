import json

from sqlalchemy import text

from tests.conftest import login, register_verified


async def test_write_is_committed_before_the_response_is_sent(client, app, mailer) -> None:  # type: ignore[no-untyped-def]
    """Regression: with request-scoped teardown the commit ran AFTER the response was sent, so a fast follow-up request
    (e.g. a UI refetch) could miss the write. We hook the ASGI 'response start' event and look at the database right then."""
    await register_verified(client, mailer)
    token = (await login(client)).json()["access_token"]
    seen: dict[str, int] = {}
    body = json.dumps({"name": "g", "target_amount_today": "1000", "target_date": "2040-01-01"}).encode()
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http", "path": "/api/v1/goals",
        "raw_path": b"/api/v1/goals", "query_string": b"", "root_path": "", "client": ("203.0.113.9", 1), "server": ("test", 80),
        "headers": [(b"host", b"test"), (b"content-type", b"application/json"), (b"authorization", f"Bearer {token}".encode()),
                    (b"content-length", str(len(body)).encode())],
    }  # fmt: skip
    sent = False

    async def receive() -> dict:  # type: ignore[type-arg]
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict) -> None:  # type: ignore[type-arg]
        if message["type"] == "http.response.start":
            seen["status"] = message["status"]
            async with app.state.sessionmaker() as s:  # a different connection: only COMMITTED rows are visible
                seen["rows_visible_at_response_start"] = (await s.execute(text("SELECT count(*) FROM goals"))).scalar_one()

    await app(scope, receive, send)
    assert seen["status"] == 201
    assert seen["rows_visible_at_response_start"] == 1
