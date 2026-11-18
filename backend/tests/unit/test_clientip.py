from app.infra.clientip import resolve_client_ip

LOOPBACK = ("127.0.0.1/32", "::1/128")


def test_header_is_ignored_when_no_hops_are_configured() -> None:
    assert resolve_client_ip("127.0.0.1", "203.0.113.9", LOOPBACK, 0) == "127.0.0.1"


def test_header_is_ignored_from_an_untrusted_peer() -> None:
    assert resolve_client_ip("198.51.100.7", "203.0.113.9", LOOPBACK, 1) == "198.51.100.7"


def test_one_trusted_hop_takes_the_entry_it_appended_not_the_spoofed_one() -> None:
    # caller sent "1.2.3.4"; our load balancer appended the real address it saw
    assert resolve_client_ip("127.0.0.1", "1.2.3.4, 203.0.113.9", LOOPBACK, 1) == "203.0.113.9"


def test_two_hops() -> None:
    assert resolve_client_ip("::1", "1.2.3.4, 203.0.113.9, 10.0.0.5", LOOPBACK, 2) == "203.0.113.9"


def test_cidr_ranges_are_trusted() -> None:
    assert resolve_client_ip("172.18.0.3", "203.0.113.9", ("172.16.0.0/12",), 1) == "203.0.113.9"


def test_short_or_garbage_header_falls_back_to_the_peer() -> None:
    assert resolve_client_ip("127.0.0.1", "203.0.113.9", LOOPBACK, 2) == "127.0.0.1"
    assert resolve_client_ip("127.0.0.1", "not-an-ip", LOOPBACK, 1) == "127.0.0.1"
    assert resolve_client_ip("127.0.0.1", "", LOOPBACK, 1) == "127.0.0.1"
    assert resolve_client_ip(None, "203.0.113.9", LOOPBACK, 1) is None
