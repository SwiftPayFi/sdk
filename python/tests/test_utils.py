"""Sync + async utils module."""

from __future__ import annotations

from typing import Any

import httpx

from swiftpay import AsyncSwiftPay, SwiftPay


def envelope(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def test_list_chains_unwraps_envelope(respx_mock: Any, chain_fixture: dict[str, Any]) -> None:
    route = respx_mock.get("/v1/utils/chains").mock(
        return_value=httpx.Response(200, json=envelope([chain_fixture]))
    )
    with SwiftPay() as client:
        chains = client.utils.list_chains()
    assert len(chains) == 1
    assert chains[0].id == "ethereum"
    assert chains[0].chain_id == 1
    assert route.calls.last.request.method == "GET"


def test_list_tokens_unwraps_envelope(respx_mock: Any, token_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/utils/tokens").mock(
        return_value=httpx.Response(200, json=envelope([token_fixture]))
    )
    with SwiftPay() as client:
        tokens = client.utils.list_tokens()
    assert len(tokens) == 1
    assert tokens[0].symbol == "USDC"
    assert tokens[0].coingecko_id == "usd-coin"


async def test_async_list_chains(respx_mock: Any, chain_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/utils/chains").mock(
        return_value=httpx.Response(200, json=envelope([chain_fixture]))
    )
    async with AsyncSwiftPay() as client:
        chains = await client.utils.list_chains()
    assert chains[0].id == "ethereum"


async def test_async_list_tokens(respx_mock: Any, token_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/utils/tokens").mock(
        return_value=httpx.Response(200, json=envelope([token_fixture]))
    )
    async with AsyncSwiftPay() as client:
        tokens = await client.utils.list_tokens()
    assert tokens[0].symbol == "USDC"
