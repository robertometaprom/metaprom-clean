-- Internal operational generation-event ledger.
-- Separate from entitlement_balances, entitlement_ledger, and Stripe purchases.
-- Does not grant, consume, or refund customer credits.
-- Service-role / server inserts only — no customer-facing access.

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  asset_id bigint,
  run_id uuid,
  recipe_id text not null,
  tier text,
  step text not null,
  vendor text not null,
  model text not null,
  provider_request_id text,
  duration_seconds integer,
  estimated_usd_micros bigint,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint generation_events_status_check
    check (status in ('success', 'failure')),
  constraint generation_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists generation_events_asset_id_idx
  on public.generation_events (asset_id);

create index if not exists generation_events_created_at_idx
  on public.generation_events (created_at desc);

create index if not exists generation_events_vendor_model_idx
  on public.generation_events (vendor, model);

create index if not exists generation_events_status_idx
  on public.generation_events (status);

alter table public.generation_events enable row level security;

revoke all on table public.generation_events
  from public, anon, authenticated;
grant all on table public.generation_events to service_role;
