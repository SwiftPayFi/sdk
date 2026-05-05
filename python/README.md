# swiftpay-api-client

Python SDK for the [SwiftPay](https://swiftpay.finance) REST API. Sync **and** async, type-checked end-to-end with Pydantic v2.

- **Two transports.** `SwiftPay` for sync code, `AsyncSwiftPay` for asyncio (FastAPI, async workers).
- **Auth-aware modules.** Methods that need a secret key raise `SwiftPayConfigError` at call time when the key is missing — no silent 401s.
- **Typed errors.** Each HTTP status maps to a discriminated subclass.
- **Two runtime deps.** `httpx` and `pydantic`.

## Install

```bash
pip install swiftpay-api-client
```

Requires Python 3.10+.

## Quick start

```python
from swiftpay import SwiftPay

client = SwiftPay(secret_key="sk_live_...")

result = client.invoices.create(
    amount="100.00",
    token="USDC",
    network="ethereum",
    recipients={"evm": "0xYourWallet..."},
    external_ref="order_8675309",
)
print("New" if result.created else "Existing", result.invoice.id)
```

### Async

```python
import asyncio
from swiftpay import AsyncSwiftPay

async def main() -> None:
    async with AsyncSwiftPay(secret_key="sk_live_...") as client:
        chains = await client.utils.list_chains()
        for c in chains:
            print(c.id, c.chain_id)

asyncio.run(main())
```

## Configuration

```python
SwiftPay(
    secret_key="sk_live_...",                 # optional — required only for secret-scoped modules
    base_url="https://api.swiftpay.finance",  # optional, defaults to production
    timeout=30.0,                              # optional, seconds
    http_client=...,                           # optional, inject your own httpx.Client
)
```

## Modules

| Module                | Auth        | Methods                                                                    |
| --------------------- | ----------- | -------------------------------------------------------------------------- |
| `client.utils`        | none        | `list_chains`, `list_tokens`                                               |
| `client.invoices`     | secret key  | `create`, `list`, `get`, `list_transactions`, `rescan`                     |
| `client.x402.facilitator` | none    | `supported`, `verify`, `settle`, `payment_status`                          |
| `client.x402.endpoints`   | secret key | `register`, `list`, `deactivate`, `requirements`, `requirements_by_id` |

`x402.facilitator.settle()` returns a `SettlementResponse` for both 200 (settled) and 422 (settlement failed). Inspect `result.success` / `result.error`. Other 4xx / 5xx still raise.

## Error handling

```python
from swiftpay import SwiftPay
from swiftpay.errors import (
    SwiftPayError,
    SwiftPayValidationError,
    SwiftPayAuthError,
    SwiftPayNotFoundError,
    SwiftPayConfigError,
    SwiftPayServerError,
)

client = SwiftPay(secret_key="sk_live_...")

try:
    client.invoices.create(amount="", token="USDC", network="ethereum")
except SwiftPayValidationError as e:
    print("Bad input:", e.details)
except SwiftPayAuthError:
    print("Bad API key")
except SwiftPayError as e:
    print("SwiftPay error", e.status, e, e.trace_id)
```

## Versioning

This SDK is pinned to one major version of the SwiftPay REST API. Each `swiftpay-api-client` major maps 1:1 to a SwiftPay API major.

| SDK            | API path prefix |
| -------------- | --------------- |
| `0.x` / `1.x`  | `/v1/...`       |

When SwiftPay ships `/v2`, we'll release `swiftpay-api-client@2.0.0` with regenerated types. Within a major, we follow [SemVer](https://semver.org).

## Development

```bash
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
ruff check .
ruff format --check .
mypy src
pytest --cov
python -m build
```

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.
