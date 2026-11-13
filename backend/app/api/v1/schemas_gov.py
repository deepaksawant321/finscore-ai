import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Reason = Literal["user_request", "regulated_question", "low_confidence", "distress", "other"]
Priority = Literal["essential", "important", "aspirational"]


# ---------- escalation ----------
class EscalationCreate(BaseModel):
    reason: Reason = "user_request"
    note: str | None = Field(default=None, max_length=1000)
    conversation_id: uuid.UUID | None = None


class EscalationOut(BaseModel):
    id: uuid.UUID
    reason: str
    status: str
    created_at: datetime
    sla_due_at: datetime
    resolved_at: datetime | None
    note: str | None
    resolution_note: str | None


class StaffEscalationOut(EscalationOut):
    user_id: uuid.UUID
    assigned_to: uuid.UUID | None


class StaffEscalationPatch(BaseModel):
    status: Literal["open", "assigned", "resolved", "closed"] | None = None
    assign_to_me: bool = False
    resolution_note: str | None = Field(default=None, max_length=2000)


# ---------- privacy ----------
class ErasureRequestIn(BaseModel):
    password: str = Field(max_length=128)


class ErasureStatusOut(BaseModel):
    pending: bool
    scheduled_for: datetime | None
    requested_at: datetime | None


# ---------- goals ----------
class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    target_amount_today: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    target_date: date
    priority: Priority = "important"
    current_funding: Decimal = Field(default=Decimal(0), ge=0, max_digits=18, decimal_places=2)
    monthly_funding: Decimal = Field(default=Decimal(0), ge=0, max_digits=18, decimal_places=2)


class GoalPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    target_amount_today: Decimal | None = Field(default=None, gt=0, max_digits=18, decimal_places=2)
    target_date: date | None = None
    priority: Priority | None = None
    current_funding: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)
    monthly_funding: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)
    status: Literal["active", "achieved", "archived"] | None = None


class GoalOut(BaseModel):
    id: uuid.UUID
    name: str
    target_amount_today: str
    target_date: date
    priority: str
    current_funding: str
    monthly_funding: str
    status: str
    source: str


class FundingOut(BaseModel):
    months_remaining: int
    future_target: str
    projected_from_current: str
    projected_from_monthly: str
    projected_total: str
    shortfall: str
    required_monthly_additional: str
    funded_ratio: str
    assumptions: list[str]
