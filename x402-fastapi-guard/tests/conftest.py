from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from swiftpay import AsyncSwiftPay
from swiftpay.types import (
    PaymentRequirements,
    PaymentRequirementsExtra,
    RequirementsResponse,
    SettlementResponse,
)


def _requirements() -> RequirementsResponse:
    return RequirementsResponse(
        x402_version=1,
        requirements=PaymentRequirements(
            scheme="exact",
            network="eip155:8453",
            amount="100000",
            asset="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            pay_to="0xmerchant",
            max_timeout_seconds=300,
            extra=PaymentRequirementsExtra(
                name="SwiftPay", version="1", merchant_id="m1", endpoint_id="e1"
            ),
            description="$0.10 per call",
        ),
    )


def _settlement_success() -> SettlementResponse:
    return SettlementResponse(
        success=True,
        transaction="0xtxhash",
        network="eip155:8453",
        payer="0xpayer",
        amount="100000",
        asset="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        payment_id="pay_123",
        settled_at="2026-05-04T12:00:00Z",
    )


def _settlement_failure() -> SettlementResponse:
    return SettlementResponse(
        success=False,
        error="signature verification failed",
    )


@pytest.fixture
def mock_client() -> AsyncSwiftPay:
    client = MagicMock(spec=AsyncSwiftPay)

    endpoints = MagicMock()
    endpoints.requirements = AsyncMock(return_value=_requirements())
    endpoints.requirements_by_id = AsyncMock(return_value=_requirements())

    facilitator = MagicMock()
    facilitator.settle = AsyncMock(return_value=_settlement_success())

    x402 = MagicMock()
    x402.endpoints = endpoints
    x402.facilitator = facilitator

    client.x402 = x402
    return client


@pytest.fixture
def mock_client_settle_fail() -> AsyncSwiftPay:
    client = MagicMock(spec=AsyncSwiftPay)

    endpoints = MagicMock()
    endpoints.requirements = AsyncMock(return_value=_requirements())
    endpoints.requirements_by_id = AsyncMock(return_value=_requirements())

    facilitator = MagicMock()
    facilitator.settle = AsyncMock(return_value=_settlement_failure())

    x402 = MagicMock()
    x402.endpoints = endpoints
    x402.facilitator = facilitator

    client.x402 = x402
    return client


@pytest.fixture
def requirements_response() -> RequirementsResponse:
    return _requirements()


@pytest.fixture
def settlement_success() -> SettlementResponse:
    return _settlement_success()
