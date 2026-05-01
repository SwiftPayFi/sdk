# Changelog

All notable changes to `swiftpay-api-client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-30

### Added

- Initial release.
- `SwiftPay` (sync) and `AsyncSwiftPay` (async) clients with optional `secret_key`, custom `base_url`, injectable `httpx` client, and request timeout.
- `utils` module: `list_chains`, `list_tokens` (no auth).
- `invoices` module: `create`, `list`, `get`, `list_transactions`, `rescan` (secret key).
- `x402.facilitator` module: `supported`, `verify`, `settle`, `payment_status` (no auth).
- `x402.endpoints` module: `register`, `list`, `deactivate`, `requirements`, `requirements_by_id` (secret key).
- Typed error classes: `SwiftPayError`, `SwiftPayConfigError`, `SwiftPayValidationError`, `SwiftPayAuthError`, `SwiftPayNotFoundError`, `SwiftPayServerError`.
- Pydantic v2 response models with full type hints.
