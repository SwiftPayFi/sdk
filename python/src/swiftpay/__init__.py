"""SwiftPay API client (sync + async)."""

from __future__ import annotations

from swiftpay.async_client import AsyncSwiftPay
from swiftpay.client import SwiftPay
from swiftpay.errors import (
    SwiftPayAuthError,
    SwiftPayConfigError,
    SwiftPayError,
    SwiftPayNotFoundError,
    SwiftPayServerError,
    SwiftPayValidationError,
)

__all__ = [
    "AsyncSwiftPay",
    "SwiftPay",
    "SwiftPayAuthError",
    "SwiftPayConfigError",
    "SwiftPayError",
    "SwiftPayNotFoundError",
    "SwiftPayServerError",
    "SwiftPayValidationError",
]

__version__ = "0.1.0"  # x-release-please-version
