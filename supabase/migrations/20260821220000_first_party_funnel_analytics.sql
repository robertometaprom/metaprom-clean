-- First-party funnel + viral attribution (STEP 2).
-- Additive only. Does not alter Stripe/payment tables.
-- Service-role writes only. No public/anon/authenticated policies.

-- ---------------------------------------------------------------------------
-- growth_events: allow share_cta_clicked (share-scoped CTA)
-- ---------------------------------------------------------------------------

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'growth_events'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%event_type%';

  if constraint_name is not null then
    execute format(
      'alter table public.growth_events drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.growth_events
  add constraint growth_events_event_type_check
  check (
    event_type in (
      'view',
      'unique_view',
      'share',
      'share_whatsapp',
      'share_copy',
      'share_created',
      'share_opened',
      'share_cta_clicked',
      'cta_click',
      'registration',
      'conversion',
      'watch_completion'
    )
  );

create index if not exists growth_events_visitor_share_type_idx
  on public.growth_events (visitor_id, share_slug, event_type);

-- ---------------------------------------------------------------------------
-- funnel_events: visit / signup / creation / checkout / payment / premium
-- ---------------------------------------------------------------------------

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'landing_visit',
      'signup_completed',
      'creation_started',
      'creation_completed',
      'preview_viewed',
      'checkout_started',
      'purchase_completed',
      'premium_activated'
    )
  ),
  visitor_id text,
  user_id uuid,
  share_slug text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint funnel_events_idempotency_key_key unique (idempotency_key)
);

create index if not exists funnel_events_event_type_created_idx
  on public.funnel_events (event_type, created_at desc);

create index if not exists funnel_events_user_type_idx
  on public.funnel_events (user_id, event_type);

create index if not exists funnel_events_visitor_type_idx
  on public.funnel_events (visitor_id, event_type);

create index if not exists funnel_events_share_type_idx
  on public.funnel_events (share_slug, event_type);

alter table public.funnel_events enable row level security;

revoke all on table public.funnel_events from anon, authenticated;
grant all on table public.funnel_events to service_role;

-- ---------------------------------------------------------------------------
-- user_attributions: durable first-touch + share ancestry (no recipient PII)
-- ---------------------------------------------------------------------------

create table if not exists public.user_attributions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  visitor_id text,
  origin_kind text not null check (
    origin_kind in ('direct', 'organic', 'utm', 'share')
  ),
  share_slug text,
  share_channel text check (
    share_channel is null
    or share_channel in ('whatsapp', 'copy_link', 'sms', 'native_share', 'other')
  ),
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  generation integer not null default 0 check (generation >= 0),
  parent_user_id uuid,
  attributed_at timestamptz not null default now()
);

create index if not exists user_attributions_share_slug_idx
  on public.user_attributions (share_slug);

create index if not exists user_attributions_origin_kind_idx
  on public.user_attributions (origin_kind);

create index if not exists user_attributions_parent_user_idx
  on public.user_attributions (parent_user_id);

alter table public.user_attributions enable row level security;

revoke all on table public.user_attributions from anon, authenticated;
grant all on table public.user_attributions to service_role;
