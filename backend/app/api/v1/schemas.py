import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FactOut(BaseModel):
    id: uuid.UUID
    field_key: str
    label: str
    value: str
    display_unit: str | None
    source_type: str
    source_ref: str | None
    verification_state: Literal["stated", "verified", "disputed"] | str
    confidence: str
    valid_from: datetime
    valid_to: datetime | None


class FactPatch(BaseModel):
    value: str = Field(max_length=60)


class FactChangeOut(BaseModel):
    fact: FactOut
    changed: bool
    material_change: bool


class CoverageItem(BaseModel):
    pillar_id: str
    name: str
    state: str
    calculator: bool
    missing: list[str]


class ConversationStart(BaseModel):
    mode: Literal["problem", "full"] = "problem"


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class ConversationOut(BaseModel):
    id: uuid.UUID
    mode: str
    messages: list[MessageOut]
    disclosure: str


class SendIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ProposalOut(BaseModel):
    id: str
    field_key: str
    label: str
    value: str
    display: str
    evidence: str
    rationale: str
    confidence: str
    origin: str
    status: str


class NextQuestion(BaseModel):
    field_key: str
    text: str
    why: str


class TurnOut(BaseModel):
    message_id: uuid.UUID
    assistant_text: str
    proposals: list[ProposalOut]
    next_question: NextQuestion | None
    progress: dict[str, int]
    ready_for_score: bool
    disclosure: str
    advice_class: str = "information"
    escalation_suggested: bool = False
    escalation_id: uuid.UUID | None = None


class Decision(BaseModel):
    proposal_id: str
    action: Literal["accept", "edit", "reject"]
    value: str | None = Field(default=None, max_length=60)


class ConfirmIn(BaseModel):
    decisions: list[Decision] = Field(max_length=30)


class RecordedFact(BaseModel):
    field_key: str
    value: str
    material_change: bool


class PillarOut(BaseModel):
    id: str
    name: str
    score: str | None
    weight: str
    effective_weight: str | None
    contribution: str | None
    missing_inputs: list[str]


class DnaTraitOut(BaseModel):
    key: str
    label: str
    value: str
    confidence: str | None
    evidence_count: int
    evidence: list[str]
    wording: str


class PersonaOut(BaseModel):
    name: str
    description: str


class ScoreOut(BaseModel):
    id: uuid.UUID
    overall: str
    score_range: tuple[int, int] = (300, 900)
    confidence: str
    trend: str
    stage: str
    stage_provisional: bool
    early_estimate: bool = Field(
        description="True when confidence is below the (placeholder) threshold: do not announce a stage."
    )
    official: bool
    rule_set: str
    rulebook_version: str
    engine_version: str
    computed_at: datetime
    pillars: list[PillarOut]
    missing_inputs: list[str]
    watermark: str | None = Field(description="Set when the result is NOT an official FinScore (demo rules).")


class DnaOut(BaseModel):
    traits: list[DnaTraitOut]
    persona: PersonaOut | None
    official: bool
    watermark: str | None


class RulebookStatus(BaseModel):
    version: str
    rule_set: str
    official: bool
    status_counts: dict[str, int]
    blocking_items: list[str]


class ExplainOut(BaseModel):
    overall: str
    reference: str
    additivity_note: str
    positive_drivers: list[PillarOut]
    negative_drivers: list[PillarOut]
    not_scored: list[PillarOut]
    missing_inputs: list[str]
    watermark: str | None


class MaterialChange(BaseModel):
    id: str
    name: str
    score_before: str | None
    score_after: str | None
    points_change: str | None


class CompareOut(BaseModel):
    from_score: str | None
    to_score: str | None
    delta: str | None
    material_changes: list[MaterialChange]
