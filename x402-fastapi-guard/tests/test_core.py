from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from swiftpay import AsyncSwiftPay

from swiftpay_x402_fastapi_guard.core import X402Rejected, X402Settled, handle_x402_request

ENDPOINT_URL = "https://api.example.com/v1/analyze"


async def test_returns_rejected_when_no_payment_header(
    mock_client: AsyncSwiftPay,
) -> None:
    outcome = await handle_x402_request(mock_client, ENDPOINT_URL, None)

    assert isinstance(outcome, X402Rejected)
    assert outcome.x402_version == 1
    assert len(outcome.accepts) == 1
    assert outcome.error is None

    mock_client.x402.endpoints.requirements.assert_awaited_once_with(url=ENDPOINT_URL)  # type: ignore[union-attr]
    mock_client.x402.facilitator.settle.assert_not_awaited()  # type: ignore[union-attr]


async def test_returns_settled_on_success(
    mock_client: AsyncSwiftPay,
) -> None:
    outcome = await handle_x402_request(mock_client, ENDPOINT_URL, "base64payload")

    assert isinstance(outcome, X402Settled)
    assert outcome.response.success is True
    assert outcome.response.transaction == "0xtxhash"


async def test_returns_rejected_with_error_on_settlement_failure(
    mock_client_settle_fail: AsyncSwiftPay,
) -> None:
    outcome = await handle_x402_request(mock_client_settle_fail, ENDPOINT_URL, "badpayload")

    assert isinstance(outcome, X402Rejected)
    assert outcome.error == "signature verification failed"


async def test_uses_requirements_by_id_when_target_is_not_url(
    mock_client: AsyncSwiftPay,
) -> None:
    outcome = await handle_x402_request(mock_client, "ep_abc123", None)

    assert isinstance(outcome, X402Rejected)
    mock_client.x402.endpoints.requirements_by_id.assert_awaited_once_with("ep_abc123")  # type: ignore[union-attr]
    mock_client.x402.endpoints.requirements.assert_not_awaited()  # type: ignore[union-attr]


async def test_uses_requirements_by_url_when_target_starts_with_http(
    mock_client: AsyncSwiftPay,
) -> None:
    await handle_x402_request(mock_client, ENDPOINT_URL, None)

    mock_client.x402.endpoints.requirements.assert_awaited_once_with(url=ENDPOINT_URL)  # type: ignore[union-attr]
    mock_client.x402.endpoints.requirements_by_id.assert_not_awaited()  # type: ignore[union-attr]


async def test_propagates_sdk_errors(
    mock_client: AsyncSwiftPay,
) -> None:
    mock_client.x402.endpoints.requirements = AsyncMock(  # type: ignore[union-attr]
        side_effect=RuntimeError("network timeout")
    )

    with pytest.raises(RuntimeError, match="network timeout"):
        await handle_x402_request(mock_client, ENDPOINT_URL, None)
