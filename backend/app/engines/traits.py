"""Rule-based trait and persona evaluation. Thresholds come from the Rulebook (injected); none are defined here."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Band:
    value: str
    lt: Decimal | None = None  # first band whose `lt` bound the input is below; band with lt=None is the fallback


@dataclass(frozen=True)
class TraitSpec:
    key: str
    label: str
    input: str
    bands: tuple[Band, ...]


@dataclass(frozen=True)
class TraitResult:
    key: str
    label: str
    value: str
    evidence: tuple[str, ...]  # input keys that supported it
    confidence: Decimal  # PLACEHOLDER method: 1 evidence input => fixed value set by rulebook caller


@dataclass(frozen=True)
class PersonaSpec:
    name: str
    when: Mapping[str, Sequence[str]]  # trait key -> accepted values (all must match)
    description: str


def evaluate_trait(spec: TraitSpec, inputs: Mapping[str, Decimal | bool | None], confidence: Decimal) -> TraitResult | None:
    x = inputs.get(spec.input)
    if x is None or isinstance(x, bool):
        return None
    for band in spec.bands:
        if band.lt is None or x < band.lt:
            return TraitResult(spec.key, spec.label, band.value, (spec.input,), confidence)
    return None


def pick_persona(personas: Sequence[PersonaSpec], traits: Mapping[str, str]) -> PersonaSpec | None:
    """First persona (in rulebook order) whose conditions all match known traits. No match => None (never guessed)."""
    for p in personas:
        if all(traits.get(k) in vals for k, vals in p.when.items()):
            return p
    return None
