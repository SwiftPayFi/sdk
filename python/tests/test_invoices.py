"""Invoices module — sync + async, plus auth gating."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from swiftpay import AsyncSwiftPay, SwiftPay, SwiftPayConfigError


def envelope(data: Any, *, metadata: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"success": True, "data": data}
    if metadata is not None:
        body["metadata"] = metadata
    return body


# ── Auth gating ──────────────────────────────────────────────────────────────


def test_every_method_requires_secret_key() -> None:
    with SwiftPay() as client:
        with pytest.raises(SwiftPayConfigError):
            client.invoices.create(amount="1", token="USDC", network="ethereum")
        with pytest.raises(SwiftPayConfigError):
            client.invoices.list()
        with pytest.raises(SwiftPayConfigError):
            client.invoices.get("id")
        with pytest.raises(SwiftPayConfigError):
            client.invoices.list_transactions("id")
        with pytest.raises(SwiftPayConfigError):
            client.invoices.rescan("id", chain="ethereum")


async def test_async_every_method_requires_secret_key() -> None:
    async with AsyncSwiftPay() as client:
        with pytest.raises(SwiftPayConfigError):
            await client.invoices.create(amount="1", token="USDC", network="ethereum")
        with pytest.raises(SwiftPayConfigError):
            await client.invoices.list()


# ── create() ─────────────────────────────────────────────────────────────────


def test_create_reports_created_true_on_201(
    respx_mock: Any, invoice_fixture: dict[str, Any]
) -> None:
    route = respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(201, json=envelope(invoice_fixture))
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.invoices.create(amount="100.00", token="USDC", network="ethereum")
    assert result.created is True
    assert result.invoice.id == "inv-1"
    assert route.calls.last.request.method == "POST"


def test_create_reports_created_false_on_200(
    respx_mock: Any, invoice_fixture: dict[str, Any]
) -> None:
    respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(200, json=envelope(invoice_fixture))
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.invoices.create(amount="100.00", token="USDC", network="ethereum")
    assert result.created is False


def test_create_serialises_optional_fields(
    respx_mock: Any, invoice_fixture: dict[str, Any]
) -> None:
    import json as _json

    route = respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(201, json=envelope(invoice_fixture))
    )
    with SwiftPay(secret_key="sk") as client:
        client.invoices.create(
            amount="100.00",
            token="USDC",
            network="ethereum",
            external_ref="order_1",
            expires_in=3600,
            metadata={"foo": "bar"},
        )
    body = _json.loads(route.calls.last.request.content)
    assert body["externalRef"] == "order_1"
    assert body["expiresIn"] == 3600
    assert body["metadata"] == {"foo": "bar"}


# ── list() ───────────────────────────────────────────────────────────────────


def test_list_returns_invoices_and_pagination(
    respx_mock: Any, invoice_fixture: dict[str, Any]
) -> None:
    respx_mock.get("/v1/invoices").mock(
        return_value=httpx.Response(
            200,
            json=envelope(
                [invoice_fixture],
                metadata={"pagination": {"page": 2, "limit": 10, "total": 25, "totalPages": 3}},
            ),
        )
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.invoices.list(page=2, limit=10)
    assert len(result.invoices) == 1
    assert result.pagination.total == 25
    assert result.pagination.total_pages == 3


def test_list_falls_back_when_metadata_missing(respx_mock: Any) -> None:
    respx_mock.get("/v1/invoices").mock(return_value=httpx.Response(200, json=envelope([])))
    with SwiftPay(secret_key="sk") as client:
        result = client.invoices.list()
    assert result.invoices == []
    assert result.pagination.page == 1


# ── get / list_transactions / rescan ─────────────────────────────────────────


def test_get_url_encodes_id(respx_mock: Any, invoice_fixture: dict[str, Any]) -> None:
    route = respx_mock.get("/v1/invoices/weird%20id%2Fwith%20slash").mock(
        return_value=httpx.Response(200, json=envelope(invoice_fixture))
    )
    with SwiftPay(secret_key="sk") as client:
        client.invoices.get("weird id/with slash")
    assert route.called


def test_list_transactions(respx_mock: Any, transaction_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/invoices/inv-1/transactions").mock(
        return_value=httpx.Response(200, json=envelope([transaction_fixture]))
    )
    with SwiftPay(secret_key="sk") as client:
        txs = client.invoices.list_transactions("inv-1")
    assert len(txs) == 1
    assert txs[0].id == "tx-1"


def test_rescan_posts_body_and_returns_count(respx_mock: Any) -> None:
    import json as _json

    route = respx_mock.post("/v1/invoices/inv-1/rescan").mock(
        return_value=httpx.Response(200, json=envelope({"found": 2}))
    )
    with SwiftPay(secret_key="sk") as client:
        result = client.invoices.rescan("inv-1", chain="ethereum", tx_hash="0xabc")
    assert result.found == 2
    body = _json.loads(route.calls.last.request.content)
    assert body == {"chain": "ethereum", "txHash": "0xabc"}


async def test_async_create_201(respx_mock: Any, invoice_fixture: dict[str, Any]) -> None:
    respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(201, json=envelope(invoice_fixture))
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.invoices.create(amount="100.00", token="USDC", network="ethereum")
    assert result.created is True
    assert result.invoice.id == "inv-1"


async def test_async_get(respx_mock: Any, invoice_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/invoices/inv-1").mock(
        return_value=httpx.Response(200, json=envelope(invoice_fixture))
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        invoice = await client.invoices.get("inv-1")
    assert invoice.id == "inv-1"


async def test_async_list_with_pagination(respx_mock: Any, invoice_fixture: dict[str, Any]) -> None:
    respx_mock.get("/v1/invoices").mock(
        return_value=httpx.Response(
            200,
            json=envelope(
                [invoice_fixture],
                metadata={"pagination": {"page": 1, "limit": 20, "total": 1, "totalPages": 1}},
            ),
        )
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.invoices.list()
    assert result.pagination.total == 1


async def test_async_list_transactions(
    respx_mock: Any, transaction_fixture: dict[str, Any]
) -> None:
    respx_mock.get("/v1/invoices/inv-1/transactions").mock(
        return_value=httpx.Response(200, json=envelope([transaction_fixture]))
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        txs = await client.invoices.list_transactions("inv-1")
    assert len(txs) == 1


async def test_async_rescan(respx_mock: Any) -> None:
    respx_mock.post("/v1/invoices/inv-1/rescan").mock(
        return_value=httpx.Response(200, json=envelope({"found": 0}))
    )
    async with AsyncSwiftPay(secret_key="sk") as client:
        result = await client.invoices.rescan("inv-1", chain="ethereum", from_block=100)
    assert result.found == 0
