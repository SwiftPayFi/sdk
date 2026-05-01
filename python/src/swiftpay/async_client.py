"""Async HTTPClient + ``AsyncSwiftPay`` top-level client."""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import httpx

from swiftpay._internal.auth import make_require_secret_key
from swiftpay.client import (
    DEFAULT_BASE_URL,
    DEFAULT_TIMEOUT,
    _decode,
    _extract_data,
    _RawResponse,
)
from swiftpay.errors import SwiftPayError, SwiftPayServerError


class AsyncHTTPClient:
    """Async sibling of :class:`swiftpay.client.HTTPClient`."""

    def __init__(
        self,
        base_url: str | None,
        *,
        get_secret_key: Any,
        timeout: float,
        http_client: httpx.AsyncClient | None,
    ) -> None:
        url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        if not url.startswith(("http://", "https://")):
            raise SwiftPayError(f"Invalid base_url: {url} — must start with http:// or https://")
        self._base_url = url
        self._get_secret_key = get_secret_key
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(timeout=timeout)
        self._timeout = timeout

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> AsyncHTTPClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def request(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        json_body: Any = None,
        accept_statuses: tuple[int, ...] | None = None,
    ) -> Any:
        raw = await self.request_raw(
            method, path, query=query, json_body=json_body, accept_statuses=accept_statuses
        )
        return _extract_data(raw.body, raw.status)

    async def request_raw(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        json_body: Any = None,
        accept_statuses: tuple[int, ...] | None = None,
    ) -> _RawResponse:
        url, headers, body = self._prepare(path, query, json_body)
        try:
            response = await self._client.request(method, url, headers=headers, content=body)
        except httpx.TimeoutException as e:
            raise SwiftPayServerError(f"Request to {path} timed out after {self._timeout}s") from e
        except httpx.HTTPError as e:
            raise SwiftPayServerError(f"Network error calling {path}: {e}") from e

        return _decode(response, accept_statuses)

    def _prepare(
        self, path: str, query: Mapping[str, Any] | None, json_body: Any
    ) -> tuple[str, dict[str, str], bytes | None]:
        url = self._base_url + (path if path.startswith("/") else f"/{path}")
        if query:
            params = {k: v for k, v in query.items() if v is not None}
            if params:
                url = str(httpx.URL(url).copy_merge_params(params))

        headers: dict[str, str] = {"accept": "application/json"}
        secret = self._get_secret_key()
        if secret:
            headers["x-swift-key"] = secret

        body: bytes | None = None
        if json_body is not None:
            headers["content-type"] = "application/json"
            body = json.dumps(json_body).encode("utf-8")

        return url, headers, body


class AsyncSwiftPay:
    """Async top-level SwiftPay client.

    Use as an async context manager so the underlying httpx connection pool
    is closed cleanly::

        async with AsyncSwiftPay(secret_key="sk_live_...") as client:
            chains = await client.utils.list_chains()
    """

    def __init__(
        self,
        *,
        secret_key: str | None = None,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._secret_key = secret_key
        self._http = AsyncHTTPClient(
            base_url,
            get_secret_key=lambda: self._secret_key,
            timeout=timeout,
            http_client=http_client,
        )
        require_secret_key = make_require_secret_key(lambda: self._secret_key)

        from swiftpay.modules.invoices import AsyncInvoicesModule
        from swiftpay.modules.utils import AsyncUtilsModule
        from swiftpay.modules.x402_endpoints import AsyncX402EndpointsModule
        from swiftpay.modules.x402_facilitator import AsyncX402FacilitatorModule

        self.utils = AsyncUtilsModule(self._http)
        self.invoices = AsyncInvoicesModule(self._http, require_secret_key)
        self.x402 = _AsyncX402Namespace(
            facilitator=AsyncX402FacilitatorModule(self._http),
            endpoints=AsyncX402EndpointsModule(self._http, require_secret_key),
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> AsyncSwiftPay:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    @property
    def secret_key(self) -> str | None:
        return self._secret_key

    @secret_key.setter
    def secret_key(self, value: str | None) -> None:
        self._secret_key = value


class _AsyncX402Namespace:
    __slots__ = ("endpoints", "facilitator")

    def __init__(self, *, facilitator: Any, endpoints: Any) -> None:
        self.facilitator = facilitator
        self.endpoints = endpoints
