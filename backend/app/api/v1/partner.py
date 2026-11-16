from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps import SessionDep, SettingsDep, bearer
from app.api.v1 import schemas_org as o
from app.domains.organizations import plans as P
from app.domains.organizations.models import ApiKey, Organization
from app.domains.organizations.partner import authenticate, score_facts
from app.domains.organizations.service import OrgService

router = APIRouter(prefix="/partner", tags=["partner"])


async def partner_key(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], session: SessionDep
) -> tuple[ApiKey, Organization]:
    return await authenticate(session, creds.credentials if creds else None)


PartnerDep = Annotated[tuple[ApiKey, Organization], Depends(partner_key)]


@router.get("/me", response_model=o.PartnerMeOut)
async def me(auth: PartnerDep, session: SessionDep, settings: SettingsDep) -> o.PartnerMeOut:
    key, org = auth
    plan = P.PLANS[org.plan_key]
    used = (await OrgService(session, settings).usage(org)).get(f"scores:{key.environment}", 0)
    return o.PartnerMeOut(
        org=org.name, environment=key.environment, plan=plan.name, scores_used=used, scores_limit=plan.scores_per_month
    )


@router.post("/scores", response_model=o.PartnerScoreOut)
async def score(body: o.PartnerScoreIn, auth: PartnerDep, session: SessionDep, settings: SettingsDep) -> o.PartnerScoreOut:
    """Computes a score from the facts sent. Counted once per successful call; a rejected request is not charged."""
    key, org = auth
    result = score_facts(settings, {k: (str(v) if isinstance(v, float) else v) for k, v in body.facts.items()})
    await OrgService(session, settings).meter(org, key.environment)  # the cap applies only to the plan's production environment
    return o.PartnerScoreOut(**result, environment=key.environment)
