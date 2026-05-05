"""x402 endpoint registration & discovery. Requires a secret API key."""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

from swiftpay.types import (
    PaymentRequirements,
    RegisterX402EndpointResult,
    RequirementsResponse,
    X402EndpointResponse,
)

if TYPE_CHECKING:
    from swiftpay.async_client import AsyncHTTPClient
    from swiftpay.client import HTTPClient


def _build_register_body(
    *,
    endpoint_url: str,
    asset: str,
    network: str,
    amount_usd: float,
    description: str | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "endpointUrl": endpoint_url,
        "asset": asset,
        "network": network,
        "amountUsd": amount_usd,
    }
    if description is not None:
        body["description"] = description
    return body


def _parse_register(data: Any) -> RegisterX402EndpointResult:
    return RegisterX402EndpointResult(
        endpoint=X402EndpointResponse.model_validate(data["endpoint"]),
        payment_requirements=PaymentRequirements.model_validate(data["payment_requirements"]),
    )


# ── Sync ─────────────────────────────────────────────────────────────────────


class X402EndpointsModule:
    def __init__(self, http: HTTPClient, require_secret_key: Callable[[str], None]) -> None:
        self._http = http
        self._require = require_secret_key

    def register(
        self,
        *,
        endpoint_url: str,
        asset: str,
        network: str,
        amount_usd: float,
        description: str | None = None,
    ) -> RegisterX402EndpointResult:
        """``POST /v1/x402/endpoints`` — register a new endpoint."""
        self._require("x402.endpoints.register")
        body = _build_register_body(
            endpoint_url=endpoint_url,
            asset=asset,
            network=network,
            amount_usd=amount_usd,
            description=description,
        )
        data = self._http.request("POST", "/v1/x402/endpoints", json_body=body)
        return _parse_register(data)

    def list(self) -> list[X402EndpointResponse]:
        """``GET /v1/x402/endpoints`` — list endpoints registered for this merchant."""
        self._require("x402.endpoints.list")
        data = self._http.request("GET", "/v1/x402/endpoints")
        return [X402EndpointResponse.model_validate(e) for e in data]

    def deactivate(self, endpoint_id: str) -> None:
        """``DELETE /v1/x402/endpoints/{id}`` — soft-delete an endpoint."""
        self._require("x402.endpoints.deactivate")
        self._http.request_raw("DELETE", f"/v1/x402/endpoints/{quote(endpoint_id, safe='')}")

    def requirements(self, *, url: str) -> RequirementsResponse:
        """``GET /v1/x402/endpoints/requirements?url=...`` — look up by endpoint URL."""
        self._require("x402.endpoints.requirements")
        data = self._http.request("GET", "/v1/x402/endpoints/requirements", query={"url": url})
        return RequirementsResponse.model_validate(data)

    def requirements_by_id(self, endpoint_id: str) -> RequirementsResponse:
        """``GET /v1/x402/endpoints/{id}/requirements`` — look up by endpoint UUID."""
        self._require("x402.endpoints.requirements_by_id")
        data = self._http.request(
            "GET", f"/v1/x402/endpoints/{quote(endpoint_id, safe='')}/requirements"
        )
        return RequirementsResponse.model_validate(data)


# ── Async ────────────────────────────────────────────────────────────────────


class AsyncX402EndpointsModule:
    def __init__(self, http: AsyncHTTPClient, require_secret_key: Callable[[str], None]) -> None:
        self._http = http
        self._require = require_secret_key

    async def register(
        self,
        *,
        endpoint_url: str,
        asset: str,
        network: str,
        amount_usd: float,
        description: str | None = None,
    ) -> RegisterX402EndpointResult:
        self._require("x402.endpoints.register")
        body = _build_register_body(
            endpoint_url=endpoint_url,
            asset=asset,
            network=network,
            amount_usd=amount_usd,
            description=description,
        )
        data = await self._http.request("POST", "/v1/x402/endpoints", json_body=body)
        return _parse_register(data)

    async def list(self) -> list[X402EndpointResponse]:
        self._require("x402.endpoints.list")
        data = await self._http.request("GET", "/v1/x402/endpoints")
        return [X402EndpointResponse.model_validate(e) for e in data]

    async def deactivate(self, endpoint_id: str) -> None:
        self._require("x402.endpoints.deactivate")
        await self._http.request_raw("DELETE", f"/v1/x402/endpoints/{quote(endpoint_id, safe='')}")

    async def requirements(self, *, url: str) -> RequirementsResponse:
        self._require("x402.endpoints.requirements")
        data = await self._http.request(
            "GET", "/v1/x402/endpoints/requirements", query={"url": url}
        )
        return RequirementsResponse.model_validate(data)

    async def requirements_by_id(self, endpoint_id: str) -> RequirementsResponse:
        self._require("x402.endpoints.requirements_by_id")
        data = await self._http.request(
            "GET", f"/v1/x402/endpoints/{quote(endpoint_id, safe='')}/requirements"
        )
        return RequirementsResponse.model_validate(data)
