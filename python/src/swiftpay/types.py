"""Pydantic v2 models for every OpenAPI schema in the SwiftPay API.

Field names follow Python idiom (``snake_case``); ``populate_by_name`` lets
callers pass either ``snake_case`` or the original ``camelCase`` from the API.
On serialisation the ``alias`` (camelCase) is emitted, matching the API.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ── Base config ──────────────────────────────────────────────────────────────


class _Model(BaseModel):
    """Base for every SwiftPay model.

    - ``populate_by_name``: accept both snake_case and camelCase on input.
    - ``extra='ignore'``: forward-compat when the API adds new fields.
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


# ── Pagination ───────────────────────────────────────────────────────────────


class PaginationMeta(_Model):
    page: int
    limit: int
    total: int
    total_pages: int = Field(alias="totalPages")


# ── Utilities ────────────────────────────────────────────────────────────────


class ChainConfig(_Model):
    id: str
    name: str
    symbol: str
    type: str
    chain_id: int = Field(alias="chainId")
    native_currency: str = Field(alias="nativeCurrency")
    block_time_seconds: int = Field(alias="blockTimeSeconds")
    confirmation_blocks: int = Field(alias="confirmationBlocks")
    explorer_url: str = Field(alias="explorerUrl")
    is_testnet: bool = Field(alias="isTestnet")


class TokenNetworkConfig(_Model):
    address: str
    decimals: int


class TokenConfig(_Model):
    symbol: str
    name: str
    type: str
    coingecko_id: str = Field(alias="coingeckoId")
    networks: dict[str, TokenNetworkConfig]


# ── Invoices ─────────────────────────────────────────────────────────────────


class TreasuryAddressResponse(_Model):
    chain_type: str = Field(alias="chainType")
    address: str


class InvoiceDepositAddress(_Model):
    network_id: str = Field(alias="networkId")
    network_name: str = Field(alias="networkName")
    network_symbol: str = Field(alias="networkSymbol")
    address: str


InvoiceStatus = Literal["pending", "partial", "paid", "completed"]
TransactionStatus = Literal["detected", "confirmed", "failed"]
TransactionType = Literal["payment", "forward"]


class TransactionResponse(_Model):
    id: str
    invoice_id: str = Field(alias="invoiceId")
    invoice_ref: str = Field(alias="invoiceRef")
    merchant_id: str = Field(alias="merchantId")
    tx_hash: str = Field(alias="txHash")
    chain: str
    asset: str
    token_address: str = Field(alias="tokenAddress")
    amount: str
    fee: str
    merchant_amount: str = Field(alias="merchantAmount")
    status: TransactionStatus
    type: TransactionType
    block_number: int = Field(alias="blockNumber")
    block_timestamp: str | None = Field(default=None, alias="blockTimestamp")
    confirmed_at: str | None = Field(default=None, alias="confirmedAt")
    created_at: str = Field(alias="createdAt")


class InvoiceResponse(_Model):
    id: str
    merchant_id: str = Field(alias="merchantId")
    external_ref: str = Field(alias="externalRef")
    reference: str
    addresses: list[InvoiceDepositAddress]
    recipient: TreasuryAddressResponse | None = None
    token_address: str = Field(alias="tokenAddress")
    token_symbol: str = Field(alias="tokenSymbol")
    target_network: str = Field(alias="targetNetwork")
    amount_expected: str = Field(alias="amountExpected")
    pending_amount: str = Field(alias="pendingAmount")
    received_amount: str = Field(alias="receivedAmount")
    platform_fee: str = Field(alias="platformFee")
    amount_remitted: str = Field(alias="amountRemitted")
    overpaid_amount: str = Field(alias="overpaidAmount")
    status: InvoiceStatus
    expires_at: str = Field(alias="expiresAt")
    created_at: str = Field(alias="createdAt")
    paid_at: str | None = Field(default=None, alias="paidAt")
    completed_at: str | None = Field(default=None, alias="completedAt")
    metadata: dict[str, Any] = Field(default_factory=dict)
    transactions: list[TransactionResponse] = Field(default_factory=list)


class CreateInvoiceResult(_Model):
    """Wraps the API response so callers can detect idempotent (HTTP 200) hits."""

    invoice: InvoiceResponse
    created: bool


class ListInvoicesResult(_Model):
    invoices: list[InvoiceResponse]
    pagination: PaginationMeta


class RescanInvoiceResult(_Model):
    found: int


# ── x402 facilitator ─────────────────────────────────────────────────────────


class PaymentRequirementsExtra(_Model):
    name: str | None = None
    version: str | None = None
    merchant_id: str | None = Field(default=None, alias="merchantId")
    endpoint_id: str | None = Field(default=None, alias="endpointId")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class PaymentRequirements(_Model):
    scheme: str
    network: str
    amount: str
    asset: str
    pay_to: str = Field(alias="payTo")
    max_timeout_seconds: int = Field(alias="maxTimeoutSeconds")
    extra: PaymentRequirementsExtra | None = None
    description: str | None = None


class FacilitatorRequest(_Model):
    x402_version: int = Field(alias="x402Version")
    payment_payload: str = Field(alias="paymentPayload")
    payment_requirements: PaymentRequirements = Field(alias="paymentRequirements")


class VerifyResponse(_Model):
    is_valid: bool = Field(alias="isValid")
    invalid_reason: str | None = Field(default=None, alias="invalidReason")
    payer: str | None = None


class SettlementResponse(_Model):
    success: bool
    transaction: str | None = None
    network: str | None = None
    payer: str | None = None
    amount: str | None = None
    asset: str | None = None
    payment_id: str | None = Field(default=None, alias="paymentId")
    settled_at: str | None = Field(default=None, alias="settledAt")
    error: str | None = None


class SupportedKind(_Model):
    x402_version: int = Field(alias="x402Version")
    scheme: str
    network: str


class SupportedResponse(_Model):
    kinds: list[SupportedKind]
    extensions: list[str] = Field(default_factory=list)
    signers: dict[str, list[str]] = Field(default_factory=dict)


PaymentStatusValue = Literal["not_found", "pending", "settled", "failed"]


class PaymentStatusResponse(_Model):
    nonce: str
    status: PaymentStatusValue
    payment_id: str | None = Field(default=None, alias="paymentId")
    transaction: str | None = None
    network: str | None = None
    payer: str | None = None
    amount: str | None = None
    settled_at: str | None = Field(default=None, alias="settledAt")


# ── x402 endpoints ───────────────────────────────────────────────────────────


class X402EndpointResponse(_Model):
    id: str
    merchant_id: str = Field(alias="merchantId")
    endpoint_url: str = Field(alias="endpointUrl")
    description: str
    asset: str
    network: str
    amount_usd: float = Field(alias="amountUsd")
    treasury_address: str = Field(alias="treasuryAddress")
    forwarder_address: str = Field(alias="forwarderAddress")
    active: bool
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class RegisterX402EndpointResult(_Model):
    endpoint: X402EndpointResponse
    payment_requirements: PaymentRequirements


class RequirementsResponse(_Model):
    x402_version: int = Field(alias="x402Version")
    requirements: PaymentRequirements
