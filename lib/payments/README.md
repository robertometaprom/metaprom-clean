# Payment abstraction

Provider-agnostic checkout for Metaprom commercial purchases.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `mock` | Active provider: `mock`, `mercadopago` (future), `stripe` (future) |

## Adding a provider

1. Implement `PaymentProvider` in `lib/payments/types.ts`.
2. Register in `lib/payments/index.ts`.
3. Set `PAYMENT_PROVIDER` in production.

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payments/checkout` | POST | Start checkout for an asset |
| `/api/payments/checkout?sessionId=` | GET | Poll payment status |
| `/api/payments/webhook` | POST | Provider webhooks |

## Methods supported (interface)

- `card`
- `oxxo`
- `spei`
- `wallet`

Mock provider completes card payments immediately and simulates OXXO via polling.
