# swiftpay-x402-fastapi-guard

x402 payment middleware for FastAPI — powered by the SwiftPay API.

## Installation

```bash
pip install swiftpay-x402-fastapi-guard
```

## Quick start

```python
from fastapi import FastAPI
from swiftpay import AsyncSwiftPay
from swiftpay_x402_fastapi_guard import X402Guard

client = AsyncSwiftPay(secret_key="sk_live_...")

app = FastAPI()
app.add_middleware(
    X402Guard,
    client=client,
    routes={"/v1/analyze": "https://api.example.com/v1/analyze"},
)

@app.get("/v1/analyze")
async def analyze():
    return {"sentiment": "positive", "score": 0.87}
```

Routes not listed in `routes` pass through unaffected.
