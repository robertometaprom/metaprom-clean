# Payment abstraction

Provider-agnostic checkout for Metaprom commercial purchases.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `mock` | Active provider: `mock`, `mercadopago` (future), `stripe` |
| `STRIPE_SECRET_KEY` | none | Required when `PAYMENT_PROVIDER=stripe` |
| `STRIPE_WEBHOOK_SECRET` | none | Required to verify Stripe webhook signatures |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app base URL for provider return URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | none | Required for unauthenticated provider webhooks to update purchase state |

## Lifecycle

Payments are provider-owned until the purchase is paid. Content generation is a
Metaprom domain concern after payment succeeds.

### Payment state machine

```text
created -> checkout_started -> awaiting_payment -> paid
```

Failure and exit paths:

```text
checkout_started -> cancelled
checkout_started -> failed
awaiting_payment -> cancelled
awaiting_payment -> failed
```

### Persistence mapping

| Lifecycle state | `purchases.status` | `assets.payment_status` |
|-----------------|--------------------|--------------------------|
| `created` | not persisted yet | unchanged |
| `checkout_started` | `pending` or `awaiting_payment` | `pending` |
| `awaiting_payment` | `awaiting_payment` | `pending` |
| `paid` | `completed` | `paid` |
| `cancelled` | `cancelled` | `none`, unless another completed purchase exists |
| `failed` | `failed` | `none`, unless another completed purchase exists |

### Metaprom post-payment flow

```text
paid -> premium_generation -> premium_ready
```

`paid` is the final payment state. Premium generation starts only after
`assets.payment_status = paid`, and premium readiness is represented by the
asset premium video fields rather than by provider state.

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
Stripe uses hosted Checkout and returns to `/studio` before Metaprom starts
premium generation.
