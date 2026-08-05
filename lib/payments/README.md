# Payment abstraction

Provider-agnostic checkout for Metaprom commercial purchases.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `mock` | Active provider: `mock`, `mercadopago` (future), `stripe` |
| `STRIPE_SECRET_KEY` | none | **Test Mode only** (`sk_test_...`). Live keys are rejected. |
| `STRIPE_WEBHOOK_SECRET` | none | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_COMMERCIAL_VIDEO` | none | Stripe Test Mode Price ID (`price_...`) for `commercial-video` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app base URL for Checkout return URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | none | Required for unauthenticated provider webhooks to update purchase state |

See `.env.example` for the full template. Do not invent Stripe IDs — create them in the Stripe Dashboard (Test Mode).

## Stripe Test Mode setup (manual Dashboard)

Required before `PAYMENT_PROVIDER=stripe` works end-to-end:

1. Enable **Test Mode** in Stripe Dashboard.
2. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.
3. Create Product **Metaprom comercial HD** + one-time Price **149 MXN** → copy Price ID (`price_...`) → `STRIPE_PRICE_ID_COMMERCIAL_VIDEO`.
4. Add webhook endpoint `POST {NEXT_PUBLIC_APP_URL}/api/payments/webhook` for events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
5. Copy webhook signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
6. Set `PAYMENT_PROVIDER=stripe` and `NEXT_PUBLIC_APP_URL` to the deployed Preview/production URL.
7. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set on the same environment.

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

`paid` is the final payment state. After a verified webhook (or client poll)
sets `assets.payment_status = paid`, premium HD generation runs:

1. Webhook path: server `after()` fulfillment (async after payment verify)
2. Client path: Studio return URL → poll → `POST /api/studio/premium-video`

Premium readiness is represented by `assets.premium_video_path` (Biblioteca + download).

## Adding a provider

1. Implement `PaymentProvider` in `lib/payments/types.ts`.
2. Register in `lib/payments/index.ts`.
3. Set `PAYMENT_PROVIDER` in the target environment.

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
Stripe uses hosted Checkout with a Test Mode Price ID and returns to `/studio`
before/while Metaprom starts premium generation.
