import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["owner", "admin", "analyst", "viewer"]
Cycle = Literal["monthly", "yearly"]


class OrgCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class OrgPatchIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class BrandingIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    brand: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    accent: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    radius: int = Field(ge=8, le=32)
    font: Literal["inter", "jakarta", "dm"] = "inter"
    powered_by: bool = True


class ModulesIn(BaseModel):
    modules: list[str] = Field(min_length=1, max_length=10)


class ConnectorIn(BaseModel):
    connected: bool


class EnvironmentIn(BaseModel):
    environment: Literal["sandbox", "live"]


class ChecklistItem(BaseModel):
    id: str
    done: bool


class PendingPlan(BaseModel):
    plan_key: str
    cycle: str | None
    effective_at: datetime


class Entitlements(BaseModel):
    plan_name: str
    scores_per_month: int | None
    hard_cap: bool
    seats: int | None
    domains: int | None
    max_modules: int | None
    live_allowed: bool
    can_remove_powered_by: bool


class UsageSummary(BaseModel):
    period: str
    scores_used: int
    scores_limit: int | None
    seats_used: int
    seats_limit: int | None
    sandbox_calls: int
    live_calls: int


class OrgOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    region: str
    plan_key: str
    billing_cycle: str
    pending_change: PendingPlan | None
    environment: str
    went_live_at: datetime | None
    branding: dict[str, object] | None
    modules: list[str]
    connectors: dict[str, bool]
    checklist: list[ChecklistItem]
    my_role: Role
    permissions: list[str]
    entitlements: Entitlements
    usage: UsageSummary
    plans_are_placeholder: bool = True


class OrgSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    my_role: Role
    plan_key: str
    environment: str


class OrgCreatedOut(BaseModel):
    org: OrgOut
    secret_key: str = Field(description="Shown once. Store it now: only a hash is kept.")


class GoLiveOut(BaseModel):
    org: OrgOut
    secret_key: str | None = Field(description="The live secret key, shown once, the first time the workspace goes live.")


class MemberOut(BaseModel):
    id: uuid.UUID
    email: str
    role: Role
    status: Literal["invited", "active"]
    last_active_at: datetime | None
    is_you: bool


class InviteIn(BaseModel):
    email: EmailStr
    role: Literal["admin", "analyst", "viewer"]


class RoleIn(BaseModel):
    role: Literal["admin", "analyst", "viewer"]


class AcceptInviteIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class ApiKeyOut(BaseModel):
    id: uuid.UUID
    kind: Literal["publishable", "secret"]
    environment: Literal["test", "live"]
    display: str = Field(description="Publishable keys in full. Secret keys masked to prefix and last four characters.")
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None


class RotateIn(BaseModel):
    environment: Literal["test", "live"] = "test"


class RotatedKeyOut(BaseModel):
    key: ApiKeyOut
    secret_key: str = Field(description="Shown once. The previous key keeps working for 24 hours.")


class PlanOut(BaseModel):
    key: str
    name: str
    price_per_month_monthly: Decimal | None
    price_per_month_yearly: Decimal | None
    scores_per_month: int | None
    overage_per_score: Decimal
    seats: int | None
    modules: int | None
    live_allowed: bool
    self_serve: bool


class PlanChangeIn(BaseModel):
    plan_key: str
    cycle: Cycle


class EstimateOut(BaseModel):
    base: Decimal
    overage_scores: int
    overage_amount: Decimal
    subtotal: Decimal
    gst: Decimal
    total: Decimal


class InvoiceOut(BaseModel):
    id: uuid.UUID
    number: str
    period: str
    plan_key: str
    billing_cycle: str
    base_amount: Decimal
    overage_scores: int
    overage_amount: Decimal
    subtotal: Decimal
    gst: Decimal
    total: Decimal
    status: str
    issued_at: datetime
    paid_at: datetime | None


class BillingOut(BaseModel):
    plan_key: str
    billing_cycle: str
    pending_change: PendingPlan | None
    plans: list[PlanOut]
    gst_rate: Decimal
    estimate: EstimateOut | None
    invoices: list[InvoiceOut]
    payments_enabled: bool = Field(
        description="False until a payment provider is connected. Invoices are issued but not collected."
    )
    plans_are_placeholder: bool = True


class InvoiceGenerateIn(BaseModel):
    period: str | None = Field(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class ActivityOut(BaseModel):
    action: str
    actor_email: str | None
    at: datetime
    meta: dict[str, object]


# ---------- partner API ----------
class PartnerScoreIn(BaseModel):
    facts: dict[str, str | int | float | bool] = Field(min_length=1, max_length=40)


class PartnerMeOut(BaseModel):
    org: str
    environment: Literal["test", "live"]
    plan: str
    scores_used: int
    scores_limit: int | None


class PartnerScoreOut(BaseModel):
    overall: str
    confidence: str
    early_estimate: bool
    stage: str | None
    official: bool
    rule_set: str
    pillars: list[dict[str, object]]
    missing_inputs: list[str]
    environment: Literal["test", "live"]
