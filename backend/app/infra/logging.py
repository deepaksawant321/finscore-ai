import logging
import re
from collections.abc import MutableMapping
from typing import Any

import structlog

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_SENSITIVE_KEYS = {"password", "new_password", "token", "refresh_token", "access_token", "authorization", "cookie"}


def _scrub(_: Any, __: str, event_dict: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    for k, v in list(event_dict.items()):
        if k.lower() in _SENSITIVE_KEYS:
            event_dict[k] = "[REDACTED]"
        elif isinstance(v, str):
            event_dict[k] = _EMAIL.sub("[email]", v)
    return event_dict


def configure_logging(env: str) -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            _scrub,
            structlog.dev.ConsoleRenderer() if env == "local" else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=False,
    )
