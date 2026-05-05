"""Typed error hierarchy mirrored from the Node SDK.

Each HTTP status maps to a discriminated subclass; catch :class:`SwiftPayError`
to get them all, or a specific one when you need to branch on what went wrong.
"""

from __future__ import annotations

from typing import Any


class SwiftPayError(Exception):
    """Base for every error raised by this SDK."""

    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        details: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.details = details
        self.trace_id = trace_id


class SwiftPayConfigError(SwiftPayError):
    """Misconfiguration on the client side (missing secret_key, bad base_url)."""


class SwiftPayValidationError(SwiftPayError):
    """400 Bad Request — input validation failed; ``details`` carries field hints."""


class SwiftPayAuthError(SwiftPayError):
    """401 Unauthorized — missing or invalid API key."""


class SwiftPayNotFoundError(SwiftPayError):
    """404 Not Found."""


class SwiftPayServerError(SwiftPayError):
    """5xx, transport errors, malformed responses."""


def error_for_status(
    status: int,
    message: str,
    *,
    details: dict[str, Any] | None = None,
    trace_id: str | None = None,
) -> SwiftPayError:
    """Map an HTTP status to the right error subclass."""
    kwargs: dict[str, Any] = {"status": status, "details": details, "trace_id": trace_id}
    if status == 400:
        return SwiftPayValidationError(message, **kwargs)
    if status == 401:
        return SwiftPayAuthError(message, **kwargs)
    if status == 404:
        return SwiftPayNotFoundError(message, **kwargs)
    if status >= 500:
        return SwiftPayServerError(message, **kwargs)
    return SwiftPayError(message, **kwargs)
