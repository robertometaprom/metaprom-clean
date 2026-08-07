# Payment abstraction

Provider-agnostic checkout for Metaprom commercial and package purchases.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `mock` | Active provider: `mock`, `mercadopago` (future), `stripe` |
| `STRIPE_SECRET_KEY` | none | **Test Mode only** (`sk_test_...`). Live keys are rejected. |
| `STRIPE_WEBHOOK_SECRET` | none | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_COMMERCIAL_1/5/10/20` | none | V1 commercial packages (Studio HD uses `commercial_1`) |
| `STRIPE_PRICE_ID_ASSETS_10/25/50/100` | none | V1 advertising-asset packages |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app base URL for Checkout return URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | none | Required for unauthenticated provider webhooks |

See `.env.example` for the full template. Do not invent Stripe IDs — create them in the Stripe Dashboard (Test Mode).

## Package checkout (canonical)

```ts
createCheckoutSession(supabase, { productKey, userId, ... })
```

- Browser sends only the stable product key (e.g. `commercial_10`).
- Server resolves package from `lib/pricing/catalog.ts`.
- Server resolves Stripe Price ID from the package env var.
- Server validates Stripe Price (Test Mode, one-time, MXN, exact amount) before Checkout.
- One reusable path for Commercial packages — no per-package checkout forks.
- Advertising Image packages (`assets_*`) are purchasable when `ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL = true` and each package has a matching Stripe Test Price.
- Billable consume: first persistence of a new finished Imagen Publicitaria (`consume_advertising_asset_on_first_persist`, idempotent per `asset_id`).

## Stripe Test Mode setup (manual Dashboard)

1. Enable **Test Mode** in Stripe Dashboard.
2. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.
3. Create the **four Commercial** V1 Products + one-time MXN Prices (do not reuse the legacy MXN $149 price).
4. Copy each `price_...` into the matching `STRIPE_PRICE_ID_COMMERCIAL_*` env var.
5. Add webhook endpoint `POST {NEXT_PUBLIC_APP_URL}/api/payments/webhook` for events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
6. Copy webhook signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
7. Set `PAYMENT_PROVIDER=stripe` and `NEXT_PUBLIC_APP_URL`.
8. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set.
9. Apply migration `20260806010000_package_entitlements.sql`.

## OXXO

Package Checkout Sessions offer `card` + `oxxo` for MXN one-time prices.

- Voucher creation (`checkout.session.completed` with `payment_status=unpaid`) → `awaiting_payment` — **no entitlement grant**.
- Cash confirmed (`checkout.session.async_payment_succeeded`) → `completed` — grant once.
- Failed / expired → no grant.

## Entitlements

| Table / RPC | Purpose |
|-------------|---------|
| `entitlement_balances` | `commercials_remaining`, `advertising_assets_remaining` |
| `entitlement_ledger` | Immutable grant/consume audit trail |
| `grant_package_entitlement` | Idempotent grant per purchase |
| `consume_entitlement` | Atomic consume |
| `consume_advertising_asset_on_first_persist` | Idempotent image consume per `asset_id` |

Purchased balances do not expire. Package purchase does **not** auto-generate all units.

One new finished Advertising Image (`assets.image_path` set for a new `asset_id`) consumes **1** `advertising_asset`. Same-project refinements that reuse `existingAssetId` do not consume again.

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payments/checkout` | POST | Package checkout (`productKey`; optional `assetId` for Studio HD) |
| `/api/payments/checkout?sessionId=` | GET | Poll payment status |
| `/api/payments/webhook` | POST | Provider webhooks |
| `/api/entitlements/balances` | GET | Current user package balances |
| `/api/entitlements/consume-advertising-asset` | POST | Idempotent consume after first finished-image persist |
