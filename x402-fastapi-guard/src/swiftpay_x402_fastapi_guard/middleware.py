from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from swiftpay import AsyncSwiftPay

from swiftpay_x402_fastapi_guard.core import X402Settled, handle_x402_request


class X402Guard(BaseHTTPMiddleware):
    """ASGI middleware that gates matching routes behind x402 payment.

    Usage::

        from swiftpay import AsyncSwiftPay
        from swiftpay_x402_fastapi_guard import X402Guard

        client = AsyncSwiftPay(secret_key="sk_live_...")

        app = FastAPI()
        app.add_middleware(
            X402Guard,
            client=client,
            routes={"/v1/analyze": "https://api.example.com/v1/analyze"},
        )
    """

    def __init__(
        self,
        app: Any,
        *,
        client: AsyncSwiftPay,
        routes: dict[str, str],
    ) -> None:
        super().__init__(app)
        self._client = client
        self._routes = routes

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        endpoint_url = self._routes.get(request.url.path)

        if endpoint_url is None:
            return await call_next(request)

        payment_header = request.headers.get("x-payment")

        outcome = await handle_x402_request(self._client, endpoint_url, payment_header)

        if not isinstance(outcome, X402Settled):
            body: dict[str, Any] = {
                "x402Version": outcome.x402_version,
                "accepts": [
                    r.model_dump(by_alias=True, exclude_none=True)
                    if hasattr(r, "model_dump")
                    else r
                    for r in outcome.accepts
                ],
            }
            if outcome.error is not None:
                body["error"] = outcome.error
            return JSONResponse(status_code=402, content=body)

        response = await call_next(request)
        response.headers["X-PAYMENT-RESPONSE"] = outcome.response.model_dump_json(
            by_alias=True, exclude_none=True
        )
        return response
