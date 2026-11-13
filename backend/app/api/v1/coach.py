import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.ai.gateway import LLMProvider
from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.api.v1.intelligence import get_llm
from app.domains.coach.service import COACH_DISCLOSURE, CoachService
from app.infra.ratelimit import rate_limit

router = APIRouter(prefix="/coach", tags=["coach"])


class CoachMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    advice_class: str | None = None


class CoachConversationOut(BaseModel):
    id: uuid.UUID
    disclosure: str
    messages: list[CoachMessageOut]
    suggested_prompts: list[str]


class CoachSendIn(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class CoachTurnOut(BaseModel):
    message_id: uuid.UUID
    assistant_text: str
    mode: str
    tools: list[str]
    advice_class: str
    escalation_suggested: bool
    escalation_id: uuid.UUID | None
    ai_rewritten: bool  # True when an LLM reworded the engine facts; False => deterministic template text
    disclosure: str


@router.post("/conversations", response_model=CoachConversationOut, status_code=201)
async def start(
    p: PrincipalDep, session: SessionDep, cfg: SettingsDep, llm: LLMProvider | None = Depends(get_llm)
) -> CoachConversationOut:
    svc = CoachService(session, cfg, llm)
    conv, first = await svc.start(p.user_id)
    return CoachConversationOut(
        id=conv.id, disclosure=COACH_DISCLOSURE, messages=[CoachMessageOut(id=first.id, role=first.role, content=first.content, advice_class=first.advice_class)],
        suggested_prompts=await svc.suggested_prompts(p.user_id),
    )  # fmt: skip


@router.get("/conversations/{conv_id}", response_model=CoachConversationOut)
async def get_conversation(conv_id: uuid.UUID, p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> CoachConversationOut:
    svc = CoachService(session, cfg, None)
    msgs = await svc.transcript(p.user_id, conv_id)
    return CoachConversationOut(
        id=conv_id, disclosure=COACH_DISCLOSURE,
        messages=[CoachMessageOut(id=m.id, role=m.role, content=m.content, advice_class=m.advice_class) for m in msgs],
        suggested_prompts=await svc.suggested_prompts(p.user_id),
    )  # fmt: skip


@router.post(
    "/conversations/{conv_id}/messages", response_model=CoachTurnOut, dependencies=[Depends(rate_limit("coach", 30, 60))]
)
async def send(
    conv_id: uuid.UUID,
    body: CoachSendIn,
    p: PrincipalDep,
    session: SessionDep,
    cfg: SettingsDep,
    client: ClientDep,
    llm: LLMProvider | None = Depends(get_llm),
) -> CoachTurnOut:
    t = await CoachService(session, cfg, llm).send(p.user_id, conv_id, body.content, client.request_id)
    return CoachTurnOut(
        message_id=t.message_id, assistant_text=t.assistant_text, mode=t.mode, tools=t.tools, advice_class=t.advice_class,
        escalation_suggested=t.escalation_suggested, escalation_id=t.escalation_id, ai_rewritten=t.llm_used, disclosure=COACH_DISCLOSURE,
    )  # fmt: skip


@router.get("/suggested-prompts", response_model=list[str])
async def suggested_prompts(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> list[str]:
    return await CoachService(session, cfg, None).suggested_prompts(p.user_id)
