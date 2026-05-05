# Changelog

All notable changes to `@swiftpayfi/api-client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-30

### Added

- Initial release.
- `SwiftPay` client class with optional `secretKey`, custom `baseUrl`, injectable `fetch`, and request timeout.
- `utils` module: `listChains`, `listTokens` (no auth).
- `invoices` module: `create`, `list`, `get`, `listTransactions`, `rescan` (secret key).
- `x402.facilitator` module: `supported`, `verify`, `settle`, `paymentStatus` (no auth).
- `x402.endpoints` module: `register`, `list`, `deactivate`, `requirements`, `requirementsById` (secret key).
- Typed error classes: `SwiftPayError`, `SwiftPayConfigError`, `SwiftPayValidationError`, `SwiftPayAuthError`, `SwiftPayNotFoundError`, `SwiftPayServerError`.
