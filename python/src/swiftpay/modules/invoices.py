"""Invoice management. Requires a secret API key."""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

# Alias the built-in so type annotations like ``list[X]`` don't collide with
# the ``.list()`` method on this module class.
_PyList = list

from swiftpay.types import (  # noqa: E402
    CreateInvoiceResult,
    InvoiceResponse,
    ListInvoicesResult,
    PaginationMeta,
    RescanInvoiceResult,
    TransactionResponse,
)

if TYPE_CHECKING:
    from swiftpay.async_client import AsyncHTTPClient
    from swiftpay.client import HTTPClient


def _build_create_body(
    amount: str,
    token: str,
    network: str,
    *,
    recipients: dict[str, str] | None,
    external_ref: str | None,
    expires_in: int | None,
    metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"amount": amount, "token": token, "network": network}
    if recipients is not None:
        body["recipients"] = recipients
    if external_ref is not None:
        body["externalRef"] = external_ref
    if expires_in is not None:
        body["expiresIn"] = expires_in
    if metadata is not None:
        body["metadata"] = metadata
    return body


def _list_query(page: int | None, limit: int | None) -> dict[str, Any]:
    return {"page": page, "limit": limit}


def _parse_create(raw_status: int, raw_body: Any) -> CreateInvoiceResult:
    payload = raw_body["data"] if isinstance(raw_body, dict) and "data" in raw_body else raw_body
    return CreateInvoiceResult(
        invoice=InvoiceResponse.model_validate(payload),
        created=raw_status == 201,
    )


def _parse_list(raw_body: Any, page: int | None, limit: int | None) -> ListInvoicesResult:
    if not isinstance(raw_body, dict):
        raw_body = {}
    invoices = [InvoiceResponse.model_validate(i) for i in raw_body.get("data") or []]
    meta = (raw_body.get("metadata") or {}).get("pagination")
    pagination = (
        PaginationMeta.model_validate(meta)
        if meta
        else PaginationMeta(page=page or 1, limit=limit or 20, total=0, total_pages=0)
    )
    return ListInvoicesResult(invoices=invoices, pagination=pagination)


# ── Sync ─────────────────────────────────────────────────────────────────────


class InvoicesModule:
    def __init__(self, http: HTTPClient, require_secret_key: Callable[[str], None]) -> None:
        self._http = http
        self._require = require_secret_key

    def create(
        self,
        *,
        amount: str,
        token: str,
        network: str,
        recipients: dict[str, str] | None = None,
        external_ref: str | None = None,
        expires_in: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CreateInvoiceResult:
        """``POST /v1/invoices`` — create or idempotently return an existing invoice."""
        self._require("invoices.create")
        body = _build_create_body(
            amount,
            token,
            network,
            recipients=recipients,
            external_ref=external_ref,
            expires_in=expires_in,
            metadata=metadata,
        )
        raw = self._http.request_raw("POST", "/v1/invoices", json_body=body)
        return _parse_create(raw.status, raw.body)

    def list(self, *, page: int | None = None, limit: int | None = None) -> ListInvoicesResult:
        """``GET /v1/invoices`` — paginated invoice list."""
        self._require("invoices.list")
        raw = self._http.request_raw("GET", "/v1/invoices", query=_list_query(page, limit))
        return _parse_list(raw.body, page, limit)

    def get(self, invoice_id: str) -> InvoiceResponse:
        """``GET /v1/invoices/{id}`` — fetch a single invoice with its transactions."""
        self._require("invoices.get")
        data = self._http.request("GET", f"/v1/invoices/{quote(invoice_id, safe='')}")
        return InvoiceResponse.model_validate(data)

    def list_transactions(self, invoice_id: str) -> _PyList[TransactionResponse]:
        """``GET /v1/invoices/{id}/transactions`` — transactions tied to an invoice."""
        self._require("invoices.list_transactions")
        data = self._http.request("GET", f"/v1/invoices/{quote(invoice_id, safe='')}/transactions")
        return [TransactionResponse.model_validate(t) for t in data]

    def rescan(
        self,
        invoice_id: str,
        *,
        chain: str,
        tx_hash: str | None = None,
        from_block: int | None = None,
    ) -> RescanInvoiceResult:
        """``POST /v1/invoices/{id}/rescan`` — replay a block range to recover missed transfers."""
        self._require("invoices.rescan")
        body: dict[str, Any] = {"chain": chain}
        if tx_hash is not None:
            body["txHash"] = tx_hash
        if from_block is not None:
            body["fromBlock"] = from_block
        data = self._http.request(
            "POST", f"/v1/invoices/{quote(invoice_id, safe='')}/rescan", json_body=body
        )
        return RescanInvoiceResult.model_validate(data)


# ── Async ────────────────────────────────────────────────────────────────────


class AsyncInvoicesModule:
    def __init__(self, http: AsyncHTTPClient, require_secret_key: Callable[[str], None]) -> None:
        self._http = http
        self._require = require_secret_key

    async def create(
        self,
        *,
        amount: str,
        token: str,
        network: str,
        recipients: dict[str, str] | None = None,
        external_ref: str | None = None,
        expires_in: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CreateInvoiceResult:
        self._require("invoices.create")
        body = _build_create_body(
            amount,
            token,
            network,
            recipients=recipients,
            external_ref=external_ref,
            expires_in=expires_in,
            metadata=metadata,
        )
        raw = await self._http.request_raw("POST", "/v1/invoices", json_body=body)
        return _parse_create(raw.status, raw.body)

    async def list(
        self, *, page: int | None = None, limit: int | None = None
    ) -> ListInvoicesResult:
        self._require("invoices.list")
        raw = await self._http.request_raw("GET", "/v1/invoices", query=_list_query(page, limit))
        return _parse_list(raw.body, page, limit)

    async def get(self, invoice_id: str) -> InvoiceResponse:
        self._require("invoices.get")
        data = await self._http.request("GET", f"/v1/invoices/{quote(invoice_id, safe='')}")
        return InvoiceResponse.model_validate(data)

    async def list_transactions(self, invoice_id: str) -> _PyList[TransactionResponse]:
        self._require("invoices.list_transactions")
        data = await self._http.request(
            "GET", f"/v1/invoices/{quote(invoice_id, safe='')}/transactions"
        )
        return [TransactionResponse.model_validate(t) for t in data]

    async def rescan(
        self,
        invoice_id: str,
        *,
        chain: str,
        tx_hash: str | None = None,
        from_block: int | None = None,
    ) -> RescanInvoiceResult:
        self._require("invoices.rescan")
        body: dict[str, Any] = {"chain": chain}
        if tx_hash is not None:
            body["txHash"] = tx_hash
        if from_block is not None:
            body["fromBlock"] = from_block
        data = await self._http.request(
            "POST", f"/v1/invoices/{quote(invoice_id, safe='')}/rescan", json_body=body
        )
        return RescanInvoiceResult.model_validate(data)
