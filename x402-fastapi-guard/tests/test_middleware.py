from __future__ import annotations

import json

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from swiftpay import AsyncSwiftPay

from swiftpay_x402_fastapi_guard import X402Guard

ENDPOINT_URL = "https://api.example.com/v1/analyze"


def _build_app(client: AsyncSwiftPay) -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        X402Guard,
        client=client,
        routes={"/v1/analyze": ENDPOINT_URL},
    )

    @app.get("/v1/analyze")
    async def analyze() -> dict[str, str]:
        return {"sentiment": "positive"}

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


async def test_returns_402_without_payment_header(mock_client: AsyncSwiftPay) -> None:
    app = _build_app(mock_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/v1/analyze")

    assert res.status_code == 402
    body = res.json()
    assert body["x402Version"] == 1
    assert len(body["accepts"]) == 1
    assert "error" not in body


async def test_serves_route_on_successful_settlement(mock_client: AsyncSwiftPay) -> None:
    app = _build_app(mock_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/v1/analyze", headers={"x-payment": "base64payload"})

    assert res.status_code == 200
    assert res.json() == {"sentiment": "positive"}
    assert "x-payment-response" in res.headers
    payment_response = json.loads(res.headers["x-payment-response"])
    assert payment_response["success"] is True


async def test_returns_402_with_error_on_settlement_failure(
    mock_client_settle_fail: AsyncSwiftPay,
) -> None:
    app = _build_app(mock_client_settle_fail)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/v1/analyze", headers={"x-payment": "badpayload"})

    assert res.status_code == 402
    body = res.json()
    assert body["error"] == "signature verification failed"


async def test_unprotected_routes_pass_through(mock_client: AsyncSwiftPay) -> None:
    app = _build_app(mock_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
    mock_client.x402.endpoints.requirements.assert_not_awaited()  # type: ignore[union-attr]
