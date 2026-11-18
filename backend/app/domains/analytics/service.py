"""First-party product analytics: an allow-listed event log in our own database. No vendor, no cookies, no personal data.

Funnel (CONVERSION_RATE_AUDIT section 7): landing -> register -> verify -> login -> Money Map -> score -> engagement.
Properties are limited to short, non-personal values (a card key, an error code, a page name): never amounts, answers, emails.
"""

import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.analytics.models import ProductEvent

EVENTS: frozenset[str] = frozenset(
    {
        "landing_view", "cta_click", "legal_view",
        "register_view", "register_submit", "register_error", "register_done", "verify_done",
        "login_view", "login_done", "login_error",
        "journey_start", "journey_answer", "journey_skip", "chapter_complete", "score_revealed",
        "home_view", "score_view", "coach_ask", "simulation_run", "goal_created",
        "export_requested", "deletion_scheduled", "support_requested", "workspace_created", "plan_upgrade_requested",
    }
)  # fmt: skip
FUNNEL: tuple[str, ...] = (
    "landing_view", "register_view", "register_done", "verify_done", "login_done", "journey_start", "score_revealed",
)  # fmt: skip
PROP_KEYS = frozenset({"card", "chapter", "code", "page", "target", "routed_to", "kind", "source"})
_SAFE = re.compile(r"^[A-Za-z0-9_.:/-]{1,60}$")  # keys and codes only: no spaces, so no free text, names or sentences


def clean_props(props: dict[str, object] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in (props or {}).items():
        if k in PROP_KEYS and isinstance(v, str) and _SAFE.match(v):
            out[k] = v
    return out


def clean_path(path: str | None) -> str | None:
    if not path:
        return None
    p = path.split("?")[0].split("#")[0][:200]  # query strings can carry tokens (verify-email, reset-password)
    return p if p.startswith("/") else None


async def record(
    session: AsyncSession,
    name: str,
    user_id: uuid.UUID | None,
    anon_id: str | None,
    path: str | None,
    props: dict[str, object] | None,
) -> bool:
    if name not in EVENTS:
        return False
    anon = anon_id if anon_id and _SAFE.match(anon_id) and len(anon_id) <= 40 else None
    session.add(
        ProductEvent(
            occurred_at=datetime.now(UTC),
            name=name,
            user_id=user_id,
            anon_id=anon,
            path=clean_path(path),
            props=clean_props(props),
        )
    )
    return True


async def funnel(session: AsyncSession, days: int) -> list[tuple[str, int, int]]:
    """(event, events, distinct people) over the last `days`. A person is a user id, or a browser id before sign-in."""
    since = datetime.now(UTC) - timedelta(days=days)
    person = func.coalesce(func.cast(ProductEvent.user_id, ProductEvent.anon_id.type), ProductEvent.anon_id)
    q = (
        select(ProductEvent.name, func.count(), func.count(func.distinct(person)))
        .where(ProductEvent.occurred_at >= since)
        .group_by(ProductEvent.name)
    )
    counts = {n: (c, d) for n, c, d in (await session.execute(q)).all()}
    ordered = [*FUNNEL, *sorted(EVENTS - set(FUNNEL))]
    return [(n, *counts.get(n, (0, 0))) for n in ordered]
