# Transaction history contract

`GET /v1/transactions` returns a stable paginated envelope:

- `data` is an array of persisted transaction records with string amounts,
  nullable memo/ledger fields, network, and a network-aware explorer URL.
- `meta` contains `page`, `limit`, `total`, and `totalPages`.
- `asset`, `direction`, `from`, and `to` are optional filters. `limit` is
  bounded by the server's maximum page size.

The checked-in `test/fixtures/transaction-list-response.json` is a safe client
integration fixture. It contains a testnet example, a dummy transaction hash,
and no credentials or signed payloads.
