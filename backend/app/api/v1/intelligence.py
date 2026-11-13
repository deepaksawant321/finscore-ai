import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.ai.gateway import LLMProvider
from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.api.v1 import schemas as sc
from app.domains.interview.service import DISCLOSURE, InterviewService
from app.domains.profile.catalog import FIELDS
from app.domains.profile.models import Fact
from app.domains.profile.service import ProfileService
from app.domains.scoring.models import ScoreRun
from app.domains.scoring.service import ScoringService
from app.infra.errors import AppError
from app.infra.ratelimit import rate_limit
from app.rulebook.loader import DEFAULT_VERSION, load_rulebook

router = APIRouter(tags=["intelligence"])
DEMO_WATERMARK = "DEMO RULES — NOT AN OFFICIAL FINSCORE"


def get_llm(request: Request) -> LLMProvider | None:
    return getattr(request.app.state, "llm", None)


def _fact_out(f: Fact) -> sc.FactOut:
    d = FIELDS.get(f.field_key)
    return sc.FactOut(
        id=f.id, field_key=f.field_key, label=d.label if d else f.field_key, value=f.value, display_unit=d.unit if d else None,
        source_type=f.source_type, source_ref=f.source_ref, verification_state=f.verification_state,
        confidence=str(f.confidence), valid_from=f.valid_from, valid_to=f.valid_to,
    )  # fmt: skip


def _score_out(run: ScoreRun) -> sc.ScoreOut:
    early = run.confidence < load_rulebook(run.rulebook_version).min_confidence_for_stage()
    return sc.ScoreOut(
        id=run.id, overall=format(run.overall, "f"), confidence=format(run.confidence, "f"), trend=run.trend, stage=run.stage,
        stage_provisional=run.stage_provisional, early_estimate=early, official=run.official, rule_set=run.rule_set,
        rulebook_version=run.rulebook_version, engine_version=run.engine_version, computed_at=run.computed_at,
        pillars=[sc.PillarOut(**p) for p in run.pillars],
        missing_inputs=list(run.missing_inputs), watermark=None if run.official else DEMO_WATERMARK,
    )  # fmt: skip


# ---------------- profile & memory ----------------
@router.get("/memory/facts", response_model=list[sc.FactOut])
async def list_facts(p: PrincipalDep, session: SessionDep) -> list[sc.FactOut]:
    return [_fact_out(f) for f in await ProfileService(session).current_facts(p.user_id)]


@router.get("/memory/facts/{key}/history", response_model=list[sc.FactOut])
async def fact_history(key: str, p: PrincipalDep, session: SessionDep) -> list[sc.FactOut]:
    if key not in FIELDS:
        raise AppError(404, "not_found", "Unknown field")
    return [_fact_out(f) for f in await ProfileService(session).history(p.user_id, key)]


@router.patch("/profile/facts/{key}", response_model=sc.FactChangeOut)
async def correct_fact(key: str, body: sc.FactPatch, p: PrincipalDep, session: SessionDep, client: ClientDep) -> sc.FactChangeOut:
    """User correction: always allowed to supersede (creates a new version; the old one stays in history)."""
    r = await ProfileService(session).record_fact(
        p.user_id, key, body.value, source_type="USER_STATED", source_ref="user_correction", user_correction=True,
        actor_ip=client.ip, request_id=client.request_id,
    )  # fmt: skip
    return sc.FactChangeOut(fact=_fact_out(r.fact), changed=r.changed, material_change=r.material_change)


@router.get("/coverage", response_model=list[sc.CoverageItem])
async def coverage(p: PrincipalDep, session: SessionDep) -> list[dict[str, Any]]:
    return await InterviewService(session, None).coverage(p.user_id)


# ---------------- interview ----------------
@router.post("/conversations", response_model=sc.ConversationOut, status_code=201)
async def start_conversation(
    body: sc.ConversationStart, p: PrincipalDep, session: SessionDep, llm: LLMProvider | None = Depends(get_llm)
) -> sc.ConversationOut:
    svc = InterviewService(session, llm)
    conv, first = await svc.start(p.user_id, body.mode)
    return sc.ConversationOut(
        id=conv.id, mode=conv.mode, disclosure=DISCLOSURE,
        messages=[sc.MessageOut(id=first.id, role=first.role, content=first.content, created_at=first.created_at)],
    )  # fmt: skip


@router.get("/conversations/{conv_id}", response_model=sc.ConversationOut)
async def get_conversation(conv_id: uuid.UUID, p: PrincipalDep, session: SessionDep) -> sc.ConversationOut:
    svc = InterviewService(session, None)
    msgs = await svc.transcript(p.user_id, conv_id)
    conv = await svc._get_conv(p.user_id, conv_id)  # noqa: SLF001
    return sc.ConversationOut(
        id=conv.id, mode=conv.mode, disclosure=DISCLOSURE,
        messages=[sc.MessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at) for m in msgs],
    )  # fmt: skip


@router.post("/conversations/{conv_id}/messages", response_model=sc.TurnOut, dependencies=[Depends(rate_limit("chat", 60, 60))])
async def send_message(
    conv_id: uuid.UUID,
    body: sc.SendIn,
    p: PrincipalDep,
    session: SessionDep,
    client: ClientDep,
    llm: LLMProvider | None = Depends(get_llm),
) -> sc.TurnOut:
    t = await InterviewService(session, llm).send(p.user_id, conv_id, body.content, client.request_id)
    return sc.TurnOut(
        message_id=t.message_id, assistant_text=t.assistant_text, proposals=[sc.ProposalOut(**x) for x in t.proposals],
        next_question=sc.NextQuestion(**t.next_question) if t.next_question else None, progress=t.progress,
        ready_for_score=t.ready_for_score, disclosure=DISCLOSURE, advice_class=t.advice_class,
        escalation_suggested=t.escalation_suggested, escalation_id=t.escalation_id,
    )  # fmt: skip


@router.post("/conversations/{conv_id}/facts/confirm", response_model=list[sc.RecordedFact])
async def confirm_facts(
    conv_id: uuid.UUID, body: sc.ConfirmIn, p: PrincipalDep, session: SessionDep, client: ClientDep
) -> list[dict[str, Any]]:
    return await InterviewService(session, None).confirm(
        p.user_id, conv_id, [d.model_dump() for d in body.decisions], client.request_id
    )


# ---------------- score, explain, DNA, persona ----------------
@router.get("/rulebook/status", response_model=sc.RulebookStatus)
async def rulebook_status(_: PrincipalDep) -> dict[str, Any]:
    return load_rulebook(DEFAULT_VERSION).status_summary()


@router.post("/score/compute", response_model=sc.ScoreOut, dependencies=[Depends(rate_limit("score", 30, 60))])
async def compute_score_ep(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> sc.ScoreOut:
    return _score_out(await ScoringService(session, cfg).compute(p.user_id, client.request_id))


@router.get("/score/current", response_model=sc.ScoreOut)
async def current_score(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> sc.ScoreOut:
    run = await ScoringService(session, cfg).latest(p.user_id)
    if run is None:
        raise AppError(404, "not_found", "No score yet", "Complete the interview to get your first score.")
    return _score_out(run)


@router.get("/score/history", response_model=list[sc.ScoreOut])
async def score_history(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep, limit: int = Query(20, ge=1, le=100)
) -> list[sc.ScoreOut]:
    return [_score_out(r) for r in await ScoringService(session, cfg).history(p.user_id, limit)]


@router.get("/score/compare", response_model=sc.CompareOut)
async def compare(
    from_run: uuid.UUID, to_run: uuid.UUID, p: PrincipalDep, session: SessionDep, cfg: SettingsDep
) -> dict[str, Any]:
    svc = ScoringService(session, cfg)
    return ScoringService.compare(await svc.get_run(p.user_id, from_run), await svc.get_run(p.user_id, to_run))


@router.get("/score/{run_id}/explain", response_model=sc.ExplainOut)
async def explain(run_id: uuid.UUID, p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> dict[str, Any]:
    run = await ScoringService(session, cfg).get_run(p.user_id, run_id)
    out = ScoringService.explain(run)
    out["watermark"] = None if run.official else DEMO_WATERMARK
    return out


@router.get("/dna", response_model=sc.DnaOut)
async def dna(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> sc.DnaOut:
    run = await ScoringService(session, cfg).latest(p.user_id)
    if run is None:
        raise AppError(404, "not_found", "No profile yet", "Complete the interview and compute your score first.")
    return sc.DnaOut(
        traits=[sc.DnaTraitOut(**t) for t in run.dna],
        persona=sc.PersonaOut(**run.persona) if run.persona else None,
        official=run.official, watermark=None if run.official else DEMO_WATERMARK,
    )  # fmt: skip
