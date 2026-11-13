"""Versioned Rulebook loader. See docs/FINANCIAL_RULEBOOK.md. Files in versions/<semver>/rulebook.json are the source of truth."""

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.engines.actions import ActionSpec, Change, Cond, PriorityConfig
from app.engines.score import Measure, PillarSpec, ScoreSpec
from app.engines.stage import Stage
from app.engines.traits import Band, PersonaSpec, TraitSpec

VERSIONS_DIR = Path(__file__).parent / "versions"
OFFICIAL_STATUSES = {"APPROVED", "SOURCE_DEFINED"}
DEFAULT_VERSION = "0.0.0-demo"


class RulebookNotApproved(Exception):
    """Raised when an official result is requested but required rules are not APPROVED / SOURCE_DEFINED."""

    def __init__(self, blocking: list[str]) -> None:
        super().__init__("Rulebook not approved: " + ", ".join(blocking))
        self.blocking = blocking


@dataclass(frozen=True)
class RuleItem:
    key: str
    status: str
    value: Any


@dataclass(frozen=True)
class Rulebook:
    version: str
    rule_set: str
    items: dict[str, RuleItem]

    def item(self, key: str) -> RuleItem:
        return self.items[key]

    @property
    def blocking_items(self) -> list[str]:
        return sorted(k for k, v in self.items.items() if v.status not in OFFICIAL_STATUSES)

    @property
    def is_official(self) -> bool:
        return not self.blocking_items

    def status_summary(self) -> dict[str, Any]:
        counts: dict[str, int] = {}
        for it in self.items.values():
            counts[it.status] = counts.get(it.status, 0) + 1
        return {
            "version": self.version, "rule_set": self.rule_set, "official": self.is_official,
            "status_counts": counts, "blocking_items": self.blocking_items,
        }  # fmt: skip

    # ---- typed accessors consumed by the pure engines ----
    def stages(self) -> tuple[Stage, ...]:
        return tuple(Stage(n, lo, hi) for n, lo, hi in self.item("score.stages").value)

    def score_spec(self) -> ScoreSpec:
        rng = self.item("score.range").value
        weights = self.item("score.weights").value
        measures = self.item("score.measures").value
        pillars = []
        for p in self.item("score.pillars").value:
            m = measures.get(p["id"])
            measure = (
                Measure(m["kind"], tuple(m["inputs"]), Decimal(m["lo"]) if "lo" in m else None, Decimal(m["hi"]) if "hi" in m else None)
                if m else None
            )  # fmt: skip
            pillars.append(PillarSpec(p["id"], p["name"], Decimal(weights[p["id"]]), measure))
        return ScoreSpec(
            Decimal(rng["min"]), Decimal(rng["max"]), Decimal(self.item("score.reference_pillar_score").value), tuple(pillars)
        )

    def trait_specs(self) -> tuple[TraitSpec, ...]:
        out = []
        for t in self.item("dna.traits").value:
            bands = tuple(Band(v, Decimal(lt) if lt is not None else None) for v, lt in t["bands"])
            out.append(TraitSpec(t["key"], t["label"], t["input"], bands))
        return tuple(out)

    def trait_confidence(self) -> Decimal:
        return Decimal(self.item("dna.confidence_single_input").value)

    def personas(self) -> tuple[PersonaSpec, ...]:
        return tuple(PersonaSpec(p["name"], p["when"], p["description"]) for p in self.item("persona.catalogue").value)

    def min_confidence_for_stage(self) -> Decimal:
        return Decimal(self.item("score.min_confidence_for_stage").value)

    def action_specs(self) -> tuple[ActionSpec, ...]:
        def val(v: Any) -> Any:
            return v if isinstance(v, bool) else Decimal(str(v))

        out = []
        for a in self.item("actions.library").value or []:
            ap, dn, ch = a["applies"], a["done"], a["change"]
            out.append(ActionSpec(
                a["key"], a["title"], a["why"], a["cta"], a["pillar"], Cond(ap["input"], ap["op"], val(ap["value"])),
                Cond(dn["input"], dn["op"], val(dn["value"])),
                Change(ch["kind"], ch["field"], val(ch["value"]) if ch.get("value") is not None else None, ch.get("of")),
                a["effort"], a["urgency"], int(a["time_to_impact_weeks"]), bool(a["supports_goals"]), a["verify_field"],
            ))  # fmt: skip
        return tuple(out)

    def priority_config(self) -> PriorityConfig:
        w = dict(self.item("priority.weights").value)
        sc = self.item("priority.scales").value
        return PriorityConfig(
            {k: Decimal(v) for k, v in w.items() if k != "max_actions"},
            {k: Decimal(v) for k, v in sc["urgency"].items()}, {k: Decimal(v) for k, v in sc["ease"].items()}, int(w["max_actions"]),
        )  # fmt: skip

    def nudge_thresholds(self) -> dict[str, int]:
        return {k: int(v) for k, v in self.item("nudges.thresholds").value.items()}

    def stage_matrix(self) -> object | None:
        matrix: object | None = self.item("score.stage_matrix").value
        return matrix


def load_rulebook(version: str = DEFAULT_VERSION) -> Rulebook:
    path = VERSIONS_DIR / version / "rulebook.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    items = {k: RuleItem(k, v["status"], v["value"]) for k, v in raw["items"].items()}
    return Rulebook(raw["version"], raw["rule_set"], items)


def assert_official_allowed(rb: Rulebook, env: str) -> None:
    """Production guard: in production only a fully approved rulebook may produce a score."""
    if env == "production" and not rb.is_official:
        raise RulebookNotApproved(rb.blocking_items)
