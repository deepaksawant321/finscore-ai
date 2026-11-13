"""Prompt registry: prompts are versioned files (prompts/<name>/vN.md). Callers record (name, version) with each AI run."""

from pathlib import Path

_DIR = Path(__file__).parent


def get_prompt(name: str, version: str = "v1", **slots: str) -> tuple[str, str]:
    text = (_DIR / name / f"{version}.md").read_text(encoding="utf-8")
    for k, v in slots.items():
        text = text.replace("{{" + k + "}}", v)
    return text, f"{name}/{version}"
