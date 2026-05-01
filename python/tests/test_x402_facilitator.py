"""x402 facilitator module — sync + async, including the 200/422 dual case."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from swiftpay import AsyncSwiftPay, SwiftPay, SwiftPayValidationError
from swiftpay.types import FacilitatorRequest


def _request(facilitator_request_dict: dict[str, Any]) -> FacilitatorRequest:
    return FacilitatorRequest.model_validate(facilitator_request_dict)


def test_supported_returns_response_no_envelope(respx_mock: Any) -> None:
    respx_mock.get("/v1/x402/supported").mock(
        return_value=httpx.Response(
            200,
            json={
                "kinds": [{"x402Version": 2, "scheme": "exact", "network": "eip155:8453"}],
                "extensions": [],
                "signers": {"eip155:*": ["0xSigner"]},
            },
        )
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.supported()
    assert result.kinds[0].network == "eip155:8453"


def test_verify_valid(respx_mock: Any, facilitator_request_dict: dict[str, Any]) -> None:
    respx_mock.post("/v1/x402/verify").mock(
        return_value=httpx.Response(200, json={"isValid": True, "payer": "0xpayer"})
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.verify(_request(facilitator_request_dict))
    assert result.is_valid is True
    assert result.payer == "0xpayer"


def test_verify_invalid(respx_mock: Any, facilitator_request_dict: dict[str, Any]) -> None:
    respx_mock.post("/v1/x402/verify").mock(
        return_value=httpx.Response(
            200, json={"isValid": False, "invalidReason": "payment_expired"}
        )
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.verify(_request(facilitator_request_dict))
    assert result.is_valid is False
    assert result.invalid_reason == "payment_expired"


def test_settle_returns_body_on_200(
    respx_mock: Any, facilitator_request_dict: dict[str, Any]
) -> None:
    respx_mock.post("/v1/x402/settle").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "transaction": "0xtx",
                "network": "eip155:8453",
                "payer": "0xpayer",
                "amount": "100000",
                "asset": "0xUSDC",
                "paymentId": "p-1",
                "settledAt": "2026-04-30T12:00:00Z",
            },
        )
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.settle(_request(facilitator_request_dict))
    assert result.success is True
    assert result.transaction == "0xtx"


def test_settle_returns_body_on_422_instead_of_throwing(
    respx_mock: Any, facilitator_request_dict: dict[str, Any]
) -> None:
    respx_mock.post("/v1/x402/settle").mock(
        return_value=httpx.Response(422, json={"success": False, "error": "payment_expired"})
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.settle(_request(facilitator_request_dict))
    assert result.success is False
    assert result.error == "payment_expired"


def test_settle_still_throws_on_400(
    respx_mock: Any, facilitator_request_dict: dict[str, Any]
) -> None:
    respx_mock.post("/v1/x402/settle").mock(
        return_value=httpx.Response(400, json={"success": False, "error": "bad request"})
    )
    with SwiftPay() as client, pytest.raises(SwiftPayValidationError):
        client.x402.facilitator.settle(_request(facilitator_request_dict))


def test_payment_status_settled(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/x402/payments/status").mock(
        return_value=httpx.Response(
            200,
            json={
                "nonce": "0xnonce",
                "status": "settled",
                "paymentId": "p-1",
                "transaction": "0xtx",
                "settledAt": "2026-04-30T12:00:00Z",
            },
        )
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.payment_status(nonce="0xnonce")
    assert result.status == "settled"
    assert "nonce=0xnonce" in str(route.calls.last.request.url)


def test_payment_status_not_found(respx_mock: Any) -> None:
    respx_mock.get("/v1/x402/payments/status").mock(
        return_value=httpx.Response(200, json={"nonce": "0xnonce", "status": "not_found"})
    )
    with SwiftPay() as client:
        result = client.x402.facilitator.payment_status(nonce="0xnonce")
    assert result.status == "not_found"


async def test_async_supported(respx_mock: Any) -> None:
    respx_mock.get("/v1/x402/supported").mock(
        return_value=httpx.Response(
            200,
            json={
                "kinds": [{"x402Version": 2, "scheme": "exact", "network": "eip155:1"}],
                "extensions": [],
                "signers": {},
            },
        )
    )
    async with AsyncSwiftPay() as client:
        result = await client.x402.facilitator.supported()
    assert result.kinds[0].network == "eip155:1"


async def test_async_verify(respx_mock: Any, facilitator_request_dict: dict[str, Any]) -> None:
    respx_mock.post("/v1/x402/verify").mock(
        return_value=httpx.Response(200, json={"isValid": True, "payer": "0xpayer"})
    )
    async with AsyncSwiftPay() as client:
        result = await client.x402.facilitator.verify(_request(facilitator_request_dict))
    assert result.is_valid is True


async def test_async_payment_status(respx_mock: Any) -> None:
    respx_mock.get("/v1/x402/payments/status").mock(
        return_value=httpx.Response(200, json={"nonce": "0xnonce", "status": "pending"})
    )
    async with AsyncSwiftPay() as client:
        result = await client.x402.facilitator.payment_status(nonce="0xnonce")
    assert result.status == "pending"


async def test_async_settle_422(respx_mock: Any, facilitator_request_dict: dict[str, Any]) -> None:
    respx_mock.post("/v1/x402/settle").mock(
        return_value=httpx.Response(422, json={"success": False, "error": "payment_expired"})
    )
    async with AsyncSwiftPay() as client:
        result = await client.x402.facilitator.settle(_request(facilitator_request_dict))
    assert result.success is False
    assert result.error == "payment_expired"
