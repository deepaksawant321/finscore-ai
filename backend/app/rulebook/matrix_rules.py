"""Loads the workbook-derived FinScore rule set (versions/<ver>/matrix_rules.json) into a `MatrixScoreSpec`.

This rule set is a DRAFT derived from the business spreadsheets (docs/rules/FINSCORE_RULES_SPEC.md). It is NOT approved by
Product, so it is always reported as unofficial and must not be shown to users as the official FinScore.
JSON floats are parsed as Decimal so no binary float ever reaches the engines.
"""

import json
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

from app.engines.matrix_score import (
    FactorSpec,
    MatrixScoreSpec,
    MatrixSpec,
    RetirementAssumptions,
    RiskProfileSpec,
    ValueKind,
)

VERSIONS_DIR = Path(__file__).parent / "versions"
MATRIX_VERSION = "matrix-0.1.0-draft"
RULE_SET_LABEL = "WORKBOOK DRAFT - NOT OFFICIAL"


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fh:
        return cast("dict[str, Any]", json.load(fh, parse_float=Decimal))


def _matrix(mid: str, raw: dict[str, Any]) -> MatrixSpec:
    rows = tuple(tuple(int(c) for c in row) for row in raw["rows_by_age_band"])
    cuts = tuple(Decimal(str(c)) for c in raw["cuts"])
    labels = tuple(str(b) for b in raw["band_labels"])
    ncols = len(cuts) + 1 + (1 if raw.get("zero_exact") else 0)
    if len(rows) != 7 or any(len(r) != ncols for r in rows) or len(labels) != ncols:
        raise ValueError(f"matrix {mid} has an inconsistent shape")
    if list(cuts) != sorted(cuts):
        raise ValueError(f"matrix {mid} cut points must be ascending")
    return MatrixSpec(mid, cast("ValueKind", raw["kind"]), cuts, bool(raw.get("zero_exact")), labels, rows)


def load_matrix_spec(version: str = MATRIX_VERSION, path: Path | None = None) -> MatrixScoreSpec:
    raw = _load_json(path or VERSIONS_DIR / version / "matrix_rules.json")
    matrices = {k: _matrix(k, v) for k, v in raw["matrices"].items()}
    flags = raw["action_areas"]["flags_positive_negative_action"]
    flag_by_name = {
        "F01": "Cashflow", "F02": "Savings", "F03": "Assets", "F04": "Networth", "F05": "Portfolio Allocation", "F06": "Income range",
        "F07": "No. of pending goals", "F08": "Ease of retirement", "F09": "FOIR", "F10": "Invested surplus", "F11": "Life Insurance Cover",
        "F12": "Health Insurance cover", "F13": "Tax planning 80C", "F14": "Tax planning 80D", "F15": "Goal Planning for kids",
    }  # fmt: skip
    factors = tuple(
        FactorSpec(
            f["id"],
            f["name"],
            Decimal(str(f["weight"])),
            tuple(f["matrix"].split("|")),
            str(flags.get(flag_by_name[f["id"]], "-")),
        )
        for f in raw["factors"]
    )
    for f in factors:
        for mid in f.matrices:
            if mid not in matrices:
                raise ValueError(f"factor {f.id} references unknown matrix {mid}")
    a = raw["age_bands"]
    msgs = tuple((Decimal(str(m["min"])), str(m["text"])) for m in raw["score_messages"])
    r = raw["retirement"]
    rp = raw["risk_profile"]
    bands = tuple((int(b["max_score"]), str(b["name"])) for b in rp["bands"])
    questions = tuple(
        tuple(int(c) for c in rp["question_option_scores"][str(i)]) for i in range(1, len(rp["question_option_scores"]) + 1)
    )
    return MatrixScoreSpec(
        version=version,
        rule_set=RULE_SET_LABEL,
        official=False,
        scale_max=Decimal(str(raw["score"]["scale_max"])),
        age_upper=tuple(None if u is None else int(u) for u in a["upper_inclusive"]),
        age_labels=tuple(str(x) for x in a["labels"]),
        factors=factors,
        matrices=matrices,
        messages=msgs,
        retirement=RetirementAssumptions(
            Decimal(str(r["inflation"])),
            Decimal(str(r["annuity_rate"])),
            int(r["default_retirement_age"]),
            int(r["default_life_expectancy"]),
            Decimal(str(r["insurance_discount_rate"])),
        ),  # fmt: skip
        risk=RiskProfileSpec(questions, bands, {k: Decimal(str(v)) for k, v in rp["annual_return_live"].items()}, "BALANCED"),
    )
