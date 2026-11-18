import time
from collections import defaultdict, deque
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request

from app.infra.errors import AppError


class InMemoryRateLimiter:
    """Sliding window, single-process. Replaced by a Redis-backed limiter at MVP 4 (SYSTEM_ARCHITECTURE §7)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window: int) -> int | None:
        now = time.monotonic()
        q = self._hits[key]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return max(1, int(window - (now - q[0])))
        q.append(now)
        return None

    def reset(self) -> None:
        self._hits.clear()


limiter = InMemoryRateLimiter()


def enforce(request: Request, key: str, limit: int, window_seconds: int) -> None:
    """Applies a limit to any caller-chosen key (e.g. an API key id) rather than the client address."""
    if not request.app.state.settings.rate_limit_enabled:
        return
    retry = limiter.check(key, limit, window_seconds)
    if retry is not None:
        raise AppError(429, "rate_limited", "Too many requests", "Please retry later.", headers={"Retry-After": str(retry)})


def rate_limit(name: str, limit: int, window_seconds: int) -> Callable[[Request], Coroutine[Any, Any, None]]:
    async def dep(request: Request) -> None:
        if not request.app.state.settings.rate_limit_enabled:
            return
        ip = request.client.host if request.client else "unknown"
        retry = limiter.check(f"{name}:{ip}", limit, window_seconds)
        if retry is not None:
            raise AppError(429, "rate_limited", "Too many requests", "Please retry later.", headers={"Retry-After": str(retry)})

    return dep
