# API error codes and HTTP status mappings

This document describes the error contract emitted by the Vela API. It is
based on the current NestJS controllers, services, and global
`HttpExceptionFilter`; it is not a list of planned or aspirational errors.

The API uses URI versioning. Unless configured otherwise, the routes below are
available under `/v1`.

## Error envelope

Every failed HTTP request is returned as JSON with this shape:

```json
{
  "statusCode": 409,
  "message": "Payment request has already been used.",
  "code": "PAYMENT_REQUEST_CONSUMED",
  "errors": [],
  "timestamp": "2026-11-23T12:00:00.000Z",
  "path": "/v1/payments"
}
```

`code` is stable and should be used for programmatic handling. `message` is
human-readable and may change. `errors` contains validation details when a
request has more than one validation failure; otherwise it is an empty array.
The filter also protects the contract for exceptions that do not provide a
code by deriving a code from the HTTP status.

## HTTP status mapping

| HTTP status | Meaning | Typical codes |
| --- | --- | --- |
| `200 OK` | Successful read, validation result, or state transition | — |
| `201 Created` | A payment request, payment intent, or wallet was created | — |
| `204 No Content` | A passkey was revoked | — |
| `400 Bad Request` | The request cannot be processed as sent | `BAD_REQUEST`, `PAYMENT_REQUEST_ID_REQUIRED`, `TRANSACTION_DATE_RANGE_INVALID`, `PAYMENT_XDR_INVALID`, `WEBAUTHN_*` validation errors |
| `401 Unauthorized` | The bearer token is missing, invalid, expired, or has an invalid subject | `UNAUTHORIZED`, `INVALID_AUTH_SUBJECT` |
| `403 Forbidden` | The authenticated user is not allowed to perform the operation | `FORBIDDEN`, `WALLET_NOT_LINKED`, `RECIPIENT_WALLET_NOT_LINKED` |
| `404 Not Found` | The requested resource is absent or not owned by the caller | `NOT_FOUND`, `PAYMENT_NOT_FOUND`, `PAYMENT_REQUEST_NOT_FOUND`, `WEBAUTHN_CREDENTIAL_NOT_FOUND` |
| `409 Conflict` | The resource exists but its current state prevents the operation | `CONFLICT`, `PAYMENT_INVALID_STATE`, `PAYMENT_REQUEST_CONSUMED`, `PAYMENT_REQUEST_ID_REPLAY`, `PAYMENT_NETWORK_MISMATCH`, `PAYMENT_REQUEST_EXPIRED`, `WALLET_ALREADY_LINKED`, `WEBAUTHN_CREDENTIAL_EXISTS`, `WEBAUTHN_CREDENTIAL_LIMIT_REACHED`, `WEBAUTHN_LAST_CREDENTIAL` |
| `422 Unprocessable Entity` | The JSON is well formed but violates the `payment-request.v1` contract | `PAYMENT_REQUEST_*` validation codes |
| `422 Unprocessable Entity` | Stellar simulation or submission was rejected by the configured provider | `STELLAR_TX_FAILED`, `STELLAR_INSUFFICIENT_BALANCE` |
| `500 Internal Server Error` | An unexpected server or configuration failure | `DB_ERROR` or no explicit code |
| `503 Service Unavailable` | The Stellar provider could not be reached or did not respond in time | `STELLAR_NETWORK_ERROR` |

`POST /v1/payment-requests/validate` is intentionally different: contract
validation results are returned in the response body with HTTP `200`, so a
client can inspect the complete list of validation errors without treating a
user-supplied payload as a transport failure.

## Endpoint-specific codes

### Authentication and common access errors

| Code | Status | Meaning |
| --- | --- | --- |
| `UNAUTHORIZED` | `401` | The authentication layer rejected the bearer token. |
| `INVALID_AUTH_SUBJECT` | `401` | The JWT does not contain a non-empty subject. |
| `FORBIDDEN` | `403` | The caller is authenticated but is not the resource owner or sender. |
| `WALLET_NOT_LINKED` | `403` | The sender wallet is not linked to the authenticated user on the active network. |
| `RECIPIENT_WALLET_NOT_LINKED` | `403` | The payment-request recipient is not linked to its authenticated owner. |

### Payment requests and payments

| Code | Status | Meaning |
| --- | --- | --- |
| `PAYMENT_REQUEST_ID_REQUIRED` | `400` | A payment request UUID or external request ID is required. |
| `PAYMENT_REQUEST_NOT_FOUND` | `404` | The payment request does not exist or is not owned by the caller. |
| `PAYMENT_REQUEST_ID_REPLAY` | `409` | The external request ID has already been used. |
| `PAYMENT_REQUEST_CONSUMED` | `409` | The payment request already has a payment. |
| `PAYMENT_NETWORK_MISMATCH` | `409` | The request and server are configured for different Stellar networks. |
| `PAYMENT_REQUEST_EXPIRED` | `409` | The payment request is past its expiry time. |
| `PAYMENT_SELF_TRANSFER` | `409` | The sender and receiver are the same user. |
| `PAYMENT_NOT_FOUND` | `404` | The payment UUID does not exist. |
| `PAYMENT_INVALID_STATE` | `409` | The payment is not in the state required by the operation. |
| `PAYMENT_XDR_INVALID` | `400` | The submitted XDR does not match the payment intent. |
| `STELLAR_ACCOUNT_NOT_FOUND` | `404` | The sender or recipient Stellar account does not exist on the active network. |
| `STELLAR_TX_FAILED` | `422` | Stellar simulation or submission rejected the transaction. |
| `STELLAR_INSUFFICIENT_BALANCE` | `422` | The transaction cannot be funded by the sender. |
| `STELLAR_NETWORK_ERROR` | `503` | The configured Stellar provider is unavailable. |
| `STELLAR_TIMEOUT` | varies | A provider or confirmation operation timed out; payment status retains the failure code when applicable. |

### Payment-request contract validation

These codes are returned by the `payment-request.v1` validator. The validate
endpoint returns them in its `errors` array with HTTP `200`; persistence of an
invalid request returns `422` with the first code in `code`.

`PAYMENT_REQUEST_PAYLOAD_INVALID`, `PAYMENT_REQUEST_FIELD_REQUIRED`,
`PAYMENT_REQUEST_FIELD_UNKNOWN`, `PAYMENT_REQUEST_TYPE_UNSUPPORTED`,
`PAYMENT_REQUEST_VERSION_UNSUPPORTED`, `PAYMENT_REQUEST_ID_INVALID`,
`PAYMENT_REQUEST_RECIPIENT_INVALID`, `PAYMENT_REQUEST_ASSET_UNSUPPORTED`,
`PAYMENT_REQUEST_AMOUNT_INVALID`, `PAYMENT_REQUEST_TIMESTAMP_INVALID`,
`PAYMENT_REQUEST_TIMESTAMP_OUT_OF_WINDOW`, `PAYMENT_REQUEST_EXPIRES_AT_INVALID`,
`PAYMENT_REQUEST_EXPIRES_AT_OUT_OF_WINDOW`, `PAYMENT_REQUEST_METADATA_INVALID`,
and `PAYMENT_REQUEST_MEMO_INVALID`.

### WebAuthn

| Code | Status | Meaning |
| --- | --- | --- |
| `WEBAUTHN_VERIFICATION_FAILED` | `400` | Registration or payment assertion verification failed. |
| `WEBAUTHN_CHALLENGE_EXPIRED` | `400` | No valid challenge remains for the ceremony. |
| `WEBAUTHN_NO_CREDENTIALS` | `400` | The user has no registered passkey. |
| `WEBAUTHN_CREDENTIAL_EXISTS` | `409` | The passkey is already registered. |
| `WEBAUTHN_CREDENTIAL_LIMIT_REACHED` | `409` | The per-user passkey limit has been reached. |
| `WEBAUTHN_CREDENTIAL_NOT_FOUND` | `404` | The passkey record is absent or not owned by the caller. |
| `WEBAUTHN_LAST_CREDENTIAL` | `409` | The last passkey cannot be revoked. |

## Compatibility and rollout notes

- This is a documentation-only contract reference; it does not change routes,
  status codes, or error bodies.
- Clients should branch on `code`, not on `message` text.
- `POST /v1/payment-requests/validate` remains a `200` validation endpoint.
- Payment creation and submission use Stellar testnet configuration in local
  and CI workflows. Live network and physical-device verification are outside
  the deterministic unit-test contract documented here.
- Never include bearer tokens, private keys, signed XDR, or raw credential
  material in error messages, fixtures, or logs.
