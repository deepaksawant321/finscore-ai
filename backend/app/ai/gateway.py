"""LLM gateway: provider-agnostic interface (AI_ARCHITECTURE section 2). Callers pass minimal text only: never ids, names,
emails or account numbers. The LLM never produces authoritative numbers; see ai/guard.py."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Literal, Protocol

import httpx
import structlog

from app.config import Settings

log = structlog.get_logger()


@dataclass(frozen=True)
class LLMMessage:
    role: Literal["user", "assistant"]
    content: str


@dataclass(frozen=True)
class LLMResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str


class LLMUnavailable(Exception):
    pass


class LLMProvider(Protocol):
    name: str

    async def complete(self, *, system: str, messages: list[LLMMessage], max_tokens: int = 800) -> LLMResult: ...


class MockProvider:
    """Deterministic test/replay provider. `handler` maps (system, messages) -> text."""

    name = "mock"

    def __init__(
        self, handler: Callable[[str, list[LLMMessage]], str] | Callable[[str, list[LLMMessage]], Awaitable[str]]
    ) -> None:
        self.handler = handler
        self.calls: list[tuple[str, list[LLMMessage]]] = []

    async def complete(self, *, system: str, messages: list[LLMMessage], max_tokens: int = 800) -> LLMResult:
        self.calls.append((system, messages))
        out = self.handler(system, messages)
        if hasattr(out, "__await__"):
            out = await out
        return LLMResult(str(out), 0, 0, "mock")


class AnthropicProvider:
    """Anthropic Messages API over httpx. Enabled only when AI_PROVIDER=anthropic and a key is configured."""

    name = "anthropic"
    URL = "https://api.anthropic.com/v1/messages"

    def __init__(self, api_key: str, model: str, timeout: float = 30.0) -> None:
        self._key, self.model, self._timeout = api_key, model, timeout

    async def complete(self, *, system: str, messages: list[LLMMessage], max_tokens: int = 800) -> LLMResult:
        body = {
            "model": self.model, "max_tokens": max_tokens, "system": system,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
        }  # fmt: skip
        headers = {"x-api-key": self._key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as c:
                r = await c.post(self.URL, json=body, headers=headers)
                r.raise_for_status()
        except httpx.HTTPError as e:
            log.error("llm_call_failed", provider=self.name, error_type=type(e).__name__)
            raise LLMUnavailable from e
        data = r.json()
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        usage = data.get("usage", {})
        return LLMResult(text, int(usage.get("input_tokens", 0)), int(usage.get("output_tokens", 0)), self.model)


def build_provider(settings: Settings) -> LLMProvider | None:
    """None => the app runs on its deterministic paths only (rule-based extraction, template replies)."""
    if settings.ai_provider == "anthropic" and settings.anthropic_api_key:
        return AnthropicProvider(settings.anthropic_api_key.get_secret_value(), settings.anthropic_model)
    return None
