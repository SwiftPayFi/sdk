"""Public utility endpoints. No authentication required."""

from __future__ import annotations

from typing import TYPE_CHECKING

from swiftpay.types import ChainConfig, TokenConfig

if TYPE_CHECKING:
    from swiftpay.async_client import AsyncHTTPClient
    from swiftpay.client import HTTPClient


class UtilsModule:
    def __init__(self, http: HTTPClient) -> None:
        self._http = http

    def list_chains(self) -> list[ChainConfig]:
        """``GET /v1/utils/chains`` — list all supported EVM chains."""
        data = self._http.request("GET", "/v1/utils/chains")
        return [ChainConfig.model_validate(c) for c in data]

    def list_tokens(self) -> list[TokenConfig]:
        """``GET /v1/utils/tokens`` — list all supported tokens with per-chain deployment info."""
        data = self._http.request("GET", "/v1/utils/tokens")
        return [TokenConfig.model_validate(t) for t in data]


class AsyncUtilsModule:
    def __init__(self, http: AsyncHTTPClient) -> None:
        self._http = http

    async def list_chains(self) -> list[ChainConfig]:
        data = await self._http.request("GET", "/v1/utils/chains")
        return [ChainConfig.model_validate(c) for c in data]

    async def list_tokens(self) -> list[TokenConfig]:
        data = await self._http.request("GET", "/v1/utils/tokens")
        return [TokenConfig.model_validate(t) for t in data]
