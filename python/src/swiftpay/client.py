"""Sync HTTPClient + ``SwiftPay`` top-level client."""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import httpx

from swiftpay._internal.auth import make_require_secret_key
from swiftpay.errors import SwiftPayError, SwiftPayServerError, error_for_status

DEFAULT_BASE_URL = "https://api.swiftpay.finance"
DEFAULT_TIMEOUT = 30.0


class _RawResponse:
    __slots__ = ("body", "status")

    def __init__(self, status: int, body: Any) -> None:
        self.status = status
        self.body = body


class HTTPClient:
    """Thin httpx wrapper. Owns header injection, query serialisation, error mapping."""

    def __init__(
        self,
        base_url: str | None,
        *,
        get_secret_key: Any,
        timeout: float,
        http_client: httpx.Client | None,
    ) -> None:
        url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        if not url.startswith(("http://", "https://")):
            raise SwiftPayError(f"Invalid base_url: {url} — must start with http:// or https://")
        self._base_url = url
        self._get_secret_key = get_secret_key
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(timeout=timeout)
        self._timeout = timeout

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> HTTPClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        json_body: Any = None,
        accept_statuses: tuple[int, ...] | None = None,
    ) -> Any:
        """Make a request and return the unwrapped envelope ``data`` (or raw body)."""
        raw = self.request_raw(
            method, path, query=query, json_body=json_body, accept_statuses=accept_statuses
        )
        return _extract_data(raw.body, raw.status)

    def request_raw(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        json_body: Any = None,
        accept_statuses: tuple[int, ...] | None = None,
    ) -> _RawResponse:
        """Same as :meth:`request` but returns ``(status, body)`` without unwrapping."""
        url, headers, body = self._prepare(path, query, json_body)
        try:
            response = self._client.request(method, url, headers=headers, content=body)
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


def _decode(response: httpx.Response, accept_statuses: tuple[int, ...] | None) -> _RawResponse:
    """Parse a httpx response into a :class:`_RawResponse` or raise."""
    text = response.text
    parsed: Any = None
    if text:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = None

    if accept_statuses and response.status_code in accept_statuses:
        return _RawResponse(response.status_code, parsed)

    if 200 <= response.status_code < 300:
        if parsed is None:
            raise SwiftPayServerError(
                f"Empty response body (status {response.status_code})",
                status=response.status_code,
            )
        return _RawResponse(response.status_code, parsed)

    err_body = parsed if isinstance(parsed, dict) else {}
    message = err_body.get("error") or f"HTTP {response.status_code}"
    raise error_for_status(
        response.status_code,
        message,
        details=err_body.get("details") if isinstance(err_body.get("details"), dict) else None,
        trace_id=err_body.get("traceId") if isinstance(err_body.get("traceId"), str) else None,
    )


def _extract_data(parsed: Any, status: int) -> Any:
    """Unwrap the ``{success: true, data: ...}`` envelope when present."""
    if isinstance(parsed, dict) and parsed.get("success") is True and "data" in parsed:
        return parsed["data"]
    if parsed is None:
        raise SwiftPayServerError(f"Empty response body (status {status})", status=status)
    return parsed


# ── Top-level client ─────────────────────────────────────────────────────────


class SwiftPay:
    """Top-level SwiftPay client. Construct once and reuse for the lifetime of the process.

    Modules are stateless wrappers around a shared :class:`HTTPClient`.
    """

    def __init__(
        self,
        *,
        secret_key: str | None = None,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._secret_key = secret_key
        self._http = HTTPClient(
            base_url,
            get_secret_key=lambda: self._secret_key,
            timeout=timeout,
            http_client=http_client,
        )
        require_secret_key = make_require_secret_key(lambda: self._secret_key)

        # Imported here to avoid a circular at module load time.
        from swiftpay.modules.invoices import InvoicesModule
        from swiftpay.modules.utils import UtilsModule
        from swiftpay.modules.x402_endpoints import X402EndpointsModule
        from swiftpay.modules.x402_facilitator import X402FacilitatorModule

        self.utils = UtilsModule(self._http)
        self.invoices = InvoicesModule(self._http, require_secret_key)
        self.x402 = _X402Namespace(
            facilitator=X402FacilitatorModule(self._http),
            endpoints=X402EndpointsModule(self._http, require_secret_key),
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> SwiftPay:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @property
    def secret_key(self) -> str | None:
        return self._secret_key

    @secret_key.setter
    def secret_key(self, value: str | None) -> None:
        self._secret_key = value


class _X402Namespace:
    """Read-only namespace bundling facilitator + endpoints under ``client.x402``."""

    __slots__ = ("endpoints", "facilitator")

    def __init__(self, *, facilitator: Any, endpoints: Any) -> None:
        self.facilitator = facilitator
        self.endpoints = endpoints
