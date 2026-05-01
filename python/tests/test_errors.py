"""Smoke tests for the error hierarchy."""

from __future__ import annotations

import pytest

from swiftpay.errors import (
    SwiftPayAuthError,
    SwiftPayConfigError,
    SwiftPayError,
    SwiftPayNotFoundError,
    SwiftPayServerError,
    SwiftPayValidationError,
    error_for_status,
)


def test_subclasses_inherit_swiftpay_error() -> None:
    assert issubclass(SwiftPayConfigError, SwiftPayError)
    assert issubclass(SwiftPayValidationError, SwiftPayError)
    assert issubclass(SwiftPayAuthError, SwiftPayError)
    assert issubclass(SwiftPayNotFoundError, SwiftPayError)
    assert issubclass(SwiftPayServerError, SwiftPayError)


def test_error_carries_status_details_and_trace_id() -> None:
    err = SwiftPayValidationError(
        "Validation failed",
        status=400,
        details={"field": "required"},
        trace_id="abc-123",
    )
    assert err.status == 400
    assert err.details == {"field": "required"}
    assert err.trace_id == "abc-123"


@pytest.mark.parametrize(
    ("status", "cls"),
    [
        (400, SwiftPayValidationError),
        (401, SwiftPayAuthError),
        (404, SwiftPayNotFoundError),
        (500, SwiftPayServerError),
        (502, SwiftPayServerError),
        (418, SwiftPayError),  # falls through to base for non-mapped statuses
    ],
)
def test_error_for_status_dispatch(status: int, cls: type[SwiftPayError]) -> None:
    err = error_for_status(status, "boom")
    assert isinstance(err, cls)
    assert err.status == status
