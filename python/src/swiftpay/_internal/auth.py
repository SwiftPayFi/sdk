"""Synchronous secret-key gate used by every secret-scoped module method."""

from __future__ import annotations

from collections.abc import Callable

from swiftpay.errors import SwiftPayConfigError


def make_require_secret_key(
    get_secret_key: Callable[[], str | None],
) -> Callable[[str], None]:
    """Build a guard that raises :class:`SwiftPayConfigError` when no key is set.

    The guard is reused by every secret-scoped module method as the first line
    of its body, so misconfiguration surfaces synchronously in dev rather than
    as a 401 round-trip in production.
    """

    def require(op: str) -> None:
        if not get_secret_key():
            raise SwiftPayConfigError(
                f"secret_key is required for {op} — pass secret_key=... when constructing SwiftPay"
            )

    return require
