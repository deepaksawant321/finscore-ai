"""Partner API: a business calls FinScore with a secret key and gets a score back. Nothing about its customer is stored."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.organizations.models import ApiKey, Organization
from app.domains.profile.catalog import FIELDS, InvalidFact, normalise_value
from app.domains.profile.service import derive_inputs
from app.engines.money import D
from app.engines.score import compute_score
from app.engines.stage import resolve_stage
from app.infra.errors import AppError
from app.infra.security import hash_token
from app.rulebook.loader import DEFAULT_VERSION, RulebookNotApproved, assert_official_allowed, load_rulebook

_UNAUTH = {"WWW-Authenticate": "Bearer"}


async def authenticate(session: AsyncSession, raw_key: str | None) -> tuple[ApiKey, Organization]:
    if not raw_key:
        raise AppError(401, "unauthorized", "API key required", headers=_UNAUTH)
    if raw_key.startswith("fs_pub_"):
        raise AppError(
            403, "wrong_key_type", "This is a publishable key", "Use a secret key (fs_sec_...) for server-to-server calls."
        )
    key = (await session.execute(select(ApiKey).where(ApiKey.key_hash == hash_token(raw_key)))).scalars().first()
    now = datetime.now(UTC)
    if key is None or key.revoked_at is not None or (key.expires_at is not None and key.expires_at <= now):
        raise AppError(401, "unauthorized", "Invalid or expired API key", headers=_UNAUTH)
    org = await session.get(Organization, key.org_id)
    if org is None:
        raise AppError(401, "unauthorized", "Invalid or expired API key", headers=_UNAUTH)
    if key.environment == "live" and org.environment != "live":
        raise AppError(
            403, "live_disabled", "This workspace is in sandbox mode", "Live keys work only while the workspace is live."
        )
    key.last_used_at = now
    return key, org


def score_facts(settings: Settings, facts: dict[str, object]) -> dict[str, object]:
    """Stateless score from facts the partner supplies. Same engine and rules as the customer app."""
    rb = load_rulebook(DEFAULT_VERSION)
    try:
        assert_official_allowed(rb, settings.env)
    except RulebookNotApproved as e:
        raise AppError(
            503, "rulebook_not_approved", "FinScore is not available yet", "The official scoring rules have not been approved."
        ) from e
    raw: dict[str, Decimal | bool | None] = {}
    for key, value in facts.items():
        if key not in FIELDS:
            raise AppError(422, "validation_error", f"Unknown field: {key}")
        try:
            v = normalise_value(FIELDS[key], value)
        except InvalidFact as e:
            raise AppError(422, "validation_error", f"{key}: {e}") from e
        kind = FIELDS[key].kind
        raw[key] = v == "true" if kind == "bool" else (D(v) if kind in ("money", "int") else None)
    result = compute_score(rb.score_spec(), derive_inputs(raw))
    if result.overall is None:
        raise AppError(
            422, "insufficient_data", "Not enough facts to compute a score", "Send at least income and monthly expenses."
        )
    early = result.confidence < rb.min_confidence_for_stage()
    age = raw.get("age")
    stage = (
        None
        if early
        else resolve_stage(result.overall, int(age) if isinstance(age, Decimal) else None, rb.stages(), rb.stage_matrix()).stage
    )
    q = Decimal("0.01")
    return {
        "overall": format(result.overall.quantize(q), "f"),
        "confidence": format(result.confidence.quantize(Decimal("0.0001")), "f"),
        "early_estimate": early,
        "stage": stage,
        "official": rb.is_official,
        "rule_set": rb.rule_set,
        "pillars": [
            {"id": p.id, "name": p.name, "score": None if p.score is None else format(p.score.quantize(q), "f"),
             "contribution": format(p.contribution.quantize(q), "f")}
            for p in result.pillars
        ],
        "missing_inputs": list(result.missing_inputs),
    }  # fmt: skip
