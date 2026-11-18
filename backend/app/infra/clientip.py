"""Which address a request really came from.

`X-Forwarded-For` is written by whoever sends the request, so it is only believed when the direct peer is a proxy we run
(`TRUSTED_PROXIES`) AND we know how many of our own proxies appended to it (`FORWARDED_HOPS`). Each trusted hop appends the
address it saw, so the client is the entry `FORWARDED_HOPS` places from the right; anything to the left of it is caller-supplied
and ignored.

The Next.js rewrite proxy does NOT append: it keeps a caller-supplied header as is and only fills it in when it is missing. So
behind Next alone the header proves nothing and `FORWARDED_HOPS` must stay 0 (every request is attributed to the Next server).
Put a load balancer or CDN that appends the real client address in front of Next and set `FORWARDED_HOPS=1`.
Run uvicorn with `--no-proxy-headers` so it does not rewrite the peer address from the same header first.
"""

import ipaddress
from functools import lru_cache

from fastapi import Request

from app.config import Settings

IPNetwork = ipaddress.IPv4Network | ipaddress.IPv6Network


@lru_cache(maxsize=32)
def _networks(entries: tuple[str, ...]) -> tuple[IPNetwork, ...]:
    return tuple(ipaddress.ip_network(e, strict=False) for e in entries)


def _is_trusted(addr: str, networks: tuple[IPNetwork, ...]) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return any(ip in n for n in networks)


def resolve_client_ip(peer: str | None, forwarded_for: str | None, trusted: tuple[str, ...], hops: int) -> str | None:
    """Pure function so the rules can be unit-tested without a server."""
    if peer is None or hops <= 0 or not forwarded_for or not _is_trusted(peer, _networks(trusted)):
        return peer
    chain = [p.strip() for p in forwarded_for.split(",") if p.strip()]
    if len(chain) < hops:
        return peer  # fewer entries than proxies we run: the header did not come through them
    candidate = chain[-hops]
    try:
        ipaddress.ip_address(candidate)
    except ValueError:
        return peer
    return candidate


def client_ip(request: Request) -> str:
    cfg: Settings = request.app.state.settings
    peer = request.client.host if request.client else None
    ip = resolve_client_ip(peer, request.headers.get("x-forwarded-for"), tuple(cfg.trusted_proxies), cfg.forwarded_hops)
    return ip or "unknown"
