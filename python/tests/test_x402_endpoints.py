"""x402 endpoints module — sync + async, plus auth gating."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx
import pytest

from swiftpay import AsyncSwiftPay, SwiftPay, SwiftPayConfigError, SwiftPayNotFoundError


def envelope(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def test_every_method_requires_secret_key() -> None:
    with SwiftPay() as client:
        with pytest.raises(SwiftPayConfigError):
            client.x402.endpoints.register(
                endpoint_url="https://x", asset="USDC", network="eip155:1", amount_usd=0.1
            )
        with pytest.raises(SwiftPayConfigError):
            client.x402.endpoints.list()
        with pytest.raises(SwiftPayConfigError):
            client.x402.endpoints.deactivate("id")
        with pytest.raises(SwiftPayConfigError):
            client.x402.endpoints.requirements(url="https://x")
        with pytest.raises(SwiftPayConfigError):
            client.x402.endpoints.requirements_by_id("id")


def test_register_returns_endpoint_and_payment_requirements(
    respx_mock: Any,
    endpoint_fixture: dict[str, Any],
    requirements_fixture: dict[str, Any],
) -> None:
    respx_mock.post("/v1/x402/endpoints").mock(
        return_value=httpx.Response(
            201,
            json=envelope(
                {"endpoint": endpoint_fixture, "payment_requirements": requirements_fixture}
            ),
        )
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.x402.endpoints.register(
            endpoint_url=endpoint_fixture["endpointUrl"],
            asset="USDC",
            network="eip155:8453",
            amount_usd=0.1,
        )
    assert result.endpoint.id == "e-1"
    assert result.payment_requirements.scheme == "exact"
    assert result.payment_requirements.pay_to == "0xForwarder"


def test_list(respx_mock: Any, endpoint_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/x402/endpoints").mock(
        return_value=httpx.Response(200, json=envelope([endpoint_fixture]))
    )
    with SwiftPay(secret_key="sk") as client:
        endpoints = client.x402.endpoints.list()
    assert len(endpoints) == 1
    assert endpoints[0].endpoint_url == "https://api.example.com/v1/analyze"


def test_deactivate_sends_delete(respx_mock: Any) -> None:
    route = respx_mock.delete("/v1/x402/endpoints/e-1").mock(
        return_value=httpx.Response(200, json={"success": True, "data": None})
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.x402.endpoints.deactivate("e-1")
    assert result is None
    assert route.called


def test_requirements_url_encodes_query(
    respx_mock: Any, requirements_fixture: dict[str, Any]
) -> None:
    route = respx_mock.get("/v1/x402/endpoints/requirements").mock(
        return_value=httpx.Response(
            200, json=envelope({"x402Version": 2, "requirements": requirements_fixture})
        )
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.x402.endpoints.requirements(url="https://api.example.com/v1/analyze")
    assert result.requirements.scheme == "exact"
    assert quote("https://api.example.com/v1/analyze", safe="") in str(route.calls.last.request.url)


def test_requirements_by_id(respx_mock: Any, requirements_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/x402/endpoints/e-1/requirements").mock(
        return_value=httpx.Response(
            200, json=envelope({"x402Version": 2, "requirements": requirements_fixture})
        )
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.x402.endpoints.requirements_by_id("e-1")
    assert result.x402_version == 2


def test_requirements_404_maps_to_not_found(respx_mock: Any) -> None:
    respx_mock.get("/v1/x402/endpoints/requirements").mock(
        return_value=httpx.Response(404, json={"success": False, "error": "no endpoint"})
    )
    with SwiftPay(secret_key="sk") as client, pytest.raises(SwiftPayNotFoundError):
        client.x402.endpoints.requirements(url="https://nope")


async def test_async_every_method_requires_secret_key() -> None:
    async with AsyncSwiftPay() as client:
        with pytest.raises(SwiftPayConfigError):
            await client.x402.endpoints.list()
        with pytest.raises(SwiftPayConfigError):
            await client.x402.endpoints.deactivate("id")
        with pytest.raises(SwiftPayConfigError):
            await client.x402.endpoints.requirements(url="https://x")
        with pytest.raises(SwiftPayConfigError):
            await client.x402.endpoints.requirements_by_id("id")


async def test_async_list(respx_mock: Any, endpoint_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/x402/endpoints").mock(
        return_value=httpx.Response(200, json=envelope([endpoint_fixture]))
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        endpoints = await client.x402.endpoints.list()
    assert len(endpoints) == 1


async def test_async_deactivate(respx_mock: Any) -> None:
    respx_mock.delete("/v1/x402/endpoints/e-1").mock(
        return_value=httpx.Response(200, json={"success": True, "data": None})
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        await client.x402.endpoints.deactivate("e-1")


async def test_async_requirements_by_url(
    respx_mock: Any, requirements_fixture: dict[str, Any]
) -> None:
    respx_mock.get("/v1/x402/endpoints/requirements").mock(
        return_value=httpx.Response(
            200, json=envelope({"x402Version": 2, "requirements": requirements_fixture})
        )
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.x402.endpoints.requirements(url="https://api.example.com/v1/analyze")
    assert result.x402_version == 2


async def test_async_requirements_by_id(
    respx_mock: Any, requirements_fixture: dict[str, Any]
) -> None:
    respx_mock.get("/v1/x402/endpoints/e-1/requirements").mock(
        return_value=httpx.Response(
            200, json=envelope({"x402Version": 2, "requirements": requirements_fixture})
        )
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.x402.endpoints.requirements_by_id("e-1")
    assert result.requirements.scheme == "exact"


async def test_async_register(
    respx_mock: Any,
    endpoint_fixture: dict[str, Any],
    requirements_fixture: dict[str, Any],
) -> None:
    respx_mock.post("/v1/x402/endpoints").mock(
        return_value=httpx.Response(
            201,
            json=envelope(
                {"endpoint": endpoint_fixture, "payment_requirements": requirements_fixture}
            ),
        )
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.x402.endpoints.register(
            endpoint_url=endpoint_fixture["endpointUrl"],
            asset="USDC",
            network="eip155:8453",
            amount_usd=0.1,
        )
    assert result.endpoint.id == "e-1"
