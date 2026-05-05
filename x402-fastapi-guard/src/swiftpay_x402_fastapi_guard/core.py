from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from swiftpay import AsyncSwiftPay
from swiftpay.types import FacilitatorRequest, SettlementResponse


@dataclass(frozen=True, slots=True)
class X402Rejected:
    x402_version: int
    accepts: list[Any]
    error: str | None = None


@dataclass(frozen=True, slots=True)
class X402Settled:
    response: SettlementResponse


X402Outcome = X402Rejected | X402Settled


async def handle_x402_request(
    client: AsyncSwiftPay,
    target: str,
    payment_header: str | None,
) -> X402Outcome:
    is_url = target.startswith("http://") or target.startswith("https://")
    if is_url:
        reqs = await client.x402.endpoints.requirements(url=target)
    else:
        reqs = await client.x402.endpoints.requirements_by_id(target)
    x402_version = reqs.x402_version
    requirements = reqs.requirements

    if payment_header is None:
        return X402Rejected(x402_version=x402_version, accepts=[requirements])

    facilitator_request = FacilitatorRequest(
        x402_version=x402_version,
        payment_payload=payment_header,
        payment_requirements=requirements,
    )

    result = await client.x402.facilitator.settle(request=facilitator_request)

    if not result.success:
        return X402Rejected(
            x402_version=x402_version,
            accepts=[requirements],
            error=result.error,
        )

    return X402Settled(response=result)
