"""Async HTTPClient parity tests — same behaviours, awaited."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from swiftpay import (
    AsyncSwiftPay,
    SwiftPayAuthError,
    SwiftPayError,
    SwiftPayServerError,
    SwiftPayValidationError,
)


def envelope(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


async def test_async_injects_x_swift_key(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/invoices").mock(return_value=httpx.Response(200, json=envelope([])))
    async with AsyncSwiftPay(secret_key="sk_async") as client:
        await client.invoices.list()
    assert route.calls.last.request.headers["x-swift-key"] == "sk_async"


async def test_async_omits_x_swift_key_when_unset(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/utils/chains").mock(
        return_value=httpx.Response(200, json=envelope([]))
    )
    async with AsyncSwiftPay() as client:
        await client.utils.list_chains()
    assert "x-swift-key" not in route.calls.last.request.headers


async def test_async_400_maps_to_validation_error(respx_mock: Any) -> None:
    respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(
            400,
            json={"success": False, "error": "Validation failed", "details": {"token": "required"}},
        )
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        with pytest.raises(SwiftPayValidationError) as exc_info:
            await client.invoices.create(amount="1", token="", network="ethereum")
    assert exc_info.value.details == {"token": "required"}


async def test_async_401_maps_to_auth_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/invoices").mock(
        return_value=httpx.Response(401, json={"success": False, "error": "bad key"})
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        with pytest.raises(SwiftPayAuthError):
            await client.invoices.list()


async def test_async_network_error_wraps_to_server_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/utils/chains").mock(side_effect=httpx.ConnectError("ECONNREFUSED"))
    async with AsyncSwiftPay() as client:
        with pytest.raises(SwiftPayServerError):
            await client.utils.list_chains()


async def test_async_timeout_wraps_to_server_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/utils/chains").mock(side_effect=httpx.ReadTimeout("slow"))
    async with AsyncSwiftPay(timeout=0.01) as client:
        with pytest.raises(SwiftPayServerError) as exc_info:
            await client.utils.list_chains()
    assert "timed out" in str(exc_info.value)


async def test_async_rejects_obviously_bad_base_url() -> None:
    with pytest.raises(SwiftPayError):
        AsyncSwiftPay(base_url="not-a-url")


async def test_async_secret_key_setter() -> None:
    async with AsyncSwiftPay() as client:
        assert client.secret_key is None
        client.secret_key = "sk_test"
        assert client.secret_key == "sk_test"
