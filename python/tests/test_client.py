"""Sync HTTPClient behaviour tests."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from swiftpay import (
    SwiftPay,
    SwiftPayAuthError,
    SwiftPayError,
    SwiftPayNotFoundError,
    SwiftPayServerError,
    SwiftPayValidationError,
)


def envelope(data: Any, *, metadata: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"success": True, "data": data}
    if metadata is not None:
        body["metadata"] = metadata
    return body


def test_injects_x_swift_key_when_secret_key_is_set(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/invoices").mock(return_value=httpx.Response(200, json=envelope([])))
    with SwiftPay(secret_key="sk_test_abc") as client:
        client.invoices.list()
    assert route.calls.last.request.headers["x-swift-key"] == "sk_test_abc"


def test_omits_x_swift_key_when_unset(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/utils/chains").mock(
        return_value=httpx.Response(200, json=envelope([]))
    )
    with SwiftPay() as client:
        client.utils.list_chains()
    assert "x-swift-key" not in route.calls.last.request.headers


def test_rejects_obviously_bad_base_url() -> None:
    with pytest.raises(SwiftPayError):
        SwiftPay(base_url="not-a-url")


def test_strips_trailing_slashes_from_base_url(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/utils/chains").mock(
        return_value=httpx.Response(200, json=envelope([]))
    )
    with SwiftPay(base_url="https://api.swiftpay.finance//") as client:
        client.utils.list_chains()
    assert route.calls.last.request.url.path == "/v1/utils/chains"


def test_query_serialisation_skips_none(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/invoices").mock(return_value=httpx.Response(200, json=envelope([])))
    with SwiftPay(secret_key="sk") as client:
        client.invoices.list(page=2, limit=None)
    url = str(route.calls.last.request.url)
    assert "page=2" in url
    assert "limit=" not in url


def test_400_maps_to_validation_error_with_details(respx_mock: Any) -> None:
    respx_mock.post("/v1/invoices").mock(
        return_value=httpx.Response(
            400,
            json={
                "success": False,
                "error": "Validation failed",
                "details": {"token": "required"},
                "traceId": "trace-1",
            },
        )
    )
    with SwiftPay(secret_key="sk") as client, pytest.raises(SwiftPayValidationError) as exc_info:
        client.invoices.create(amount="1", token="", network="ethereum")
    err = exc_info.value
    assert err.status == 400
    assert err.details == {"token": "required"}
    assert err.trace_id == "trace-1"


def test_401_maps_to_auth_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/invoices").mock(
        return_value=httpx.Response(401, json={"success": False, "error": "bad key"})
    )
    with SwiftPay(secret_key="sk") as client, pytest.raises(SwiftPayAuthError):
        client.invoices.list()


def test_404_maps_to_not_found_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/invoices/nope").mock(
        return_value=httpx.Response(404, json={"success": False, "error": "not found"})
    )
    with SwiftPay(secret_key="sk") as client, pytest.raises(SwiftPayNotFoundError):
        client.invoices.get("nope")


def test_502_maps_to_server_error(respx_mock: Any) -> None:
    respx_mock.post("/v1/invoices/inv-1/rescan").mock(
        return_value=httpx.Response(502, json={"success": False, "error": "rpc"})
    )
    with SwiftPay(secret_key="sk") as client, pytest.raises(SwiftPayServerError):
        client.invoices.rescan("inv-1", chain="ethereum")


def test_network_error_wraps_to_server_error(respx_mock: Any) -> None:
    respx_mock.get("/v1/utils/chains").mock(side_effect=httpx.ConnectError("ECONNREFUSED"))
    with SwiftPay() as client, pytest.raises(SwiftPayServerError):
        client.utils.list_chains()


def test_secret_key_setter_updates_underlying_header(respx_mock: Any) -> None:
    route = respx_mock.get("/v1/invoices").mock(return_value=httpx.Response(200, json=envelope([])))
    with SwiftPay() as client:
        client.secret_key = "sk_rotated"
        assert client.secret_key == "sk_rotated"
        client.invoices.list()
    assert route.calls.last.request.headers["x-swift-key"] == "sk_rotated"


def test_timeout_wraps_to_server_error_with_timeout_message(respx_mock: Any) -> None:
    respx_mock.get("/v1/utils/chains").mock(side_effect=httpx.ReadTimeout("slow"))
    with SwiftPay(timeout=0.01) as client, pytest.raises(SwiftPayServerError) as exc_info:
        client.utils.list_chains()
    assert "timed out" in str(exc_info.value)
