"""x402 facilitator endpoints. No authentication required — protocol is signature-bound."""

from __future__ import annotations

from typing import TYPE_CHECKING

from swiftpay.types import (
    FacilitatorRequest,
    PaymentStatusResponse,
    SettlementResponse,
    SupportedResponse,
    VerifyResponse,
)

if TYPE_CHECKING:
    from swiftpay.async_client import AsyncHTTPClient
    from swiftpay.client import HTTPClient

# OpenAPI returns SettlementResponse for both 200 (success) and 422 (settlement
# failed). settle() inspects the body for both — other 4xx/5xx still raise.
_SETTLE_ACCEPT = (422,)


def _serialise_facilitator_request(request: FacilitatorRequest) -> dict[str, object]:
    return request.model_dump(by_alias=True, exclude_none=True)


# ── Sync ─────────────────────────────────────────────────────────────────────


class X402FacilitatorModule:
    def __init__(self, http: HTTPClient) -> None:
        self._http = http

    def supported(self) -> SupportedResponse:
        """``GET /v1/x402/supported``."""
        data = self._http.request("GET", "/v1/x402/supported")
        return SupportedResponse.model_validate(data)

    def verify(self, request: FacilitatorRequest) -> VerifyResponse:
        """``POST /v1/x402/verify`` — validate without on-chain side effects."""
        data = self._http.request(
            "POST", "/v1/x402/verify", json_body=_serialise_facilitator_request(request)
        )
        return VerifyResponse.model_validate(data)

    def settle(self, request: FacilitatorRequest) -> SettlementResponse:
        """``POST /v1/x402/settle`` — execute the on-chain transfer.

        Returns ``SettlementResponse`` for both 200 and 422; inspect ``success``
        / ``error`` to decide. Other 4xx/5xx raise.
        """
        raw = self._http.request_raw(
            "POST",
            "/v1/x402/settle",
            json_body=_serialise_facilitator_request(request),
            accept_statuses=_SETTLE_ACCEPT,
        )
        return SettlementResponse.model_validate(raw.body)

    def payment_status(self, *, nonce: str) -> PaymentStatusResponse:
        """``GET /v1/x402/payments/status?nonce=...``."""
        data = self._http.request("GET", "/v1/x402/payments/status", query={"nonce": nonce})
        return PaymentStatusResponse.model_validate(data)


# ── Async ────────────────────────────────────────────────────────────────────


class AsyncX402FacilitatorModule:
    def __init__(self, http: AsyncHTTPClient) -> None:
        self._http = http

    async def supported(self) -> SupportedResponse:
        data = await self._http.request("GET", "/v1/x402/supported")
        return SupportedResponse.model_validate(data)

    async def verify(self, request: FacilitatorRequest) -> VerifyResponse:
        data = await self._http.request(
            "POST", "/v1/x402/verify", json_body=_serialise_facilitator_request(request)
        )
        return VerifyResponse.model_validate(data)

    async def settle(self, request: FacilitatorRequest) -> SettlementResponse:
        raw = await self._http.request_raw(
            "POST",
            "/v1/x402/settle",
            json_body=_serialise_facilitator_request(request),
            accept_statuses=_SETTLE_ACCEPT,
        )
        return SettlementResponse.model_validate(raw.body)

    async def payment_status(self, *, nonce: str) -> PaymentStatusResponse:
        data = await self._http.request("GET", "/v1/x402/payments/status", query={"nonce": nonce})
        return PaymentStatusResponse.model_validate(data)
