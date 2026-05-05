"""Shared fixtures for the SDK test suite."""

from __future__ import annotations

from typing import Any

import pytest
import respx

DEFAULT_BASE_URL = "https://api.swiftpay.finance"


@pytest.fixture
def respx_mock() -> Any:
    """A respx router scoped to the SwiftPay base URL.

    Tests mount routes onto this router and assert calls.
    """
    with respx.mock(base_url=DEFAULT_BASE_URL, assert_all_called=False) as router:
        yield router


# ── Fixtures (sample API payloads) ───────────────────────────────────────────


@pytest.fixture
def chain_fixture() -> dict[str, Any]:
    return {
        "id": "ethereum",
        "name": "Ethereum",
        "symbol": "ETH",
        "type": "evm",
        "chainId": 1,
        "nativeCurrency": "ETH",
        "blockTimeSeconds": 12,
        "confirmationBlocks": 12,
        "explorerUrl": "https://etherscan.io",
        "isTestnet": False,
    }


@pytest.fixture
def token_fixture() -> dict[str, Any]:
    return {
        "symbol": "USDC",
        "name": "USD Coin",
        "type": "ERC-20",
        "coingeckoId": "usd-coin",
        "networks": {"1": {"address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "decimals": 6}},
    }


@pytest.fixture
def invoice_fixture() -> dict[str, Any]:
    return {
        "id": "inv-1",
        "merchantId": "m-1",
        "externalRef": "order_1",
        "reference": "SP-2024-001",
        "addresses": [],
        "recipient": None,
        "tokenAddress": "0xA0b8...",
        "tokenSymbol": "USDC",
        "targetNetwork": "ethereum",
        "amountExpected": "100.00",
        "pendingAmount": "100.00",
        "receivedAmount": "0.00",
        "platformFee": "0.00",
        "amountRemitted": "0.00",
        "overpaidAmount": "0.00",
        "status": "pending",
        "expiresAt": "2026-04-30T11:00:00Z",
        "createdAt": "2026-04-30T10:00:00Z",
        "paidAt": None,
        "completedAt": None,
        "metadata": {},
        "transactions": [],
    }


@pytest.fixture
def transaction_fixture() -> dict[str, Any]:
    return {
        "id": "tx-1",
        "invoiceId": "inv-1",
        "invoiceRef": "SP-2024-001",
        "merchantId": "m-1",
        "txHash": "0xabc",
        "chain": "ethereum",
        "asset": "USDC",
        "tokenAddress": "0xA0b8...",
        "amount": "100.00",
        "fee": "1.00",
        "merchantAmount": "99.00",
        "status": "confirmed",
        "type": "payment",
        "blockNumber": 19500000,
        "blockTimestamp": "2026-04-30T10:04:48Z",
        "confirmedAt": "2026-04-30T10:05:30Z",
        "createdAt": "2026-04-30T10:05:00Z",
    }


@pytest.fixture
def endpoint_fixture() -> dict[str, Any]:
    return {
        "id": "e-1",
        "merchantId": "m-1",
        "endpointUrl": "https://api.example.com/v1/analyze",
        "description": "Sentiment analysis",
        "asset": "USDC",
        "network": "eip155:8453",
        "amountUsd": 0.1,
        "treasuryAddress": "0xMerchant",
        "forwarderAddress": "0xForwarder",
        "active": True,
        "createdAt": "2026-04-30T12:00:00Z",
        "updatedAt": "2026-04-30T12:00:00Z",
    }


@pytest.fixture
def requirements_fixture() -> dict[str, Any]:
    return {
        "scheme": "exact",
        "network": "eip155:8453",
        "amount": "100000",
        "asset": "0xUSDC",
        "payTo": "0xForwarder",
        "maxTimeoutSeconds": 300,
        "description": "Sentiment analysis",
    }


@pytest.fixture
def facilitator_request_dict() -> dict[str, Any]:
    return {
        "x402Version": 2,
        "paymentPayload": "eyJ4NDAyVmVyc2lvbiI6Miw...",
        "paymentRequirements": {
            "scheme": "exact",
            "network": "eip155:8453",
            "amount": "100000",
            "asset": "0xUSDC",
            "payTo": "0xForwarder",
            "maxTimeoutSeconds": 300,
        },
    }
