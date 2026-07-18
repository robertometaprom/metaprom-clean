-- RC1.3.5 PR1b: Growth Engine foundation
-- Extends preview persistence for public growth assets and future analytics.

-- ---------------------------------------------------------------------------
-- Preview visibility + timestamps
-- ---------------------------------------------------------------------------

alter table if exists public.assets
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'unlisted', 'private')),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill updated_at from created_at for existing rows
update public.assets
set updated_at = coalesce(created_at, now())
where updated_at is null;

-- Previews with a share slug are public growth assets by default
update public.assets
set visibility = 'public'
where share_slug is not null
  and teaser_video_path is not null
  and visibility = 'public';

create index if not exists assets_visibility_idx
  on public.assets (visibility)
  where share_slug is not null;

-- Keep updated_at current on every asset mutation
create or replace function public.set_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assets_set_updated_at on public.assets;

create trigger assets_set_updated_at
  before update on public.assets
  for each row
  execute function public.set_assets_updated_at();

-- share_slug is immutable once assigned
create or replace function public.prevent_share_slug_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.share_slug is not null
     and new.share_slug is distinct from old.share_slug then
    raise exception 'share_slug is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists assets_share_slug_immutable on public.assets;

create trigger assets_share_slug_immutable
  before update on public.assets
  for each row
  execute function public.prevent_share_slug_mutation();

-- ---------------------------------------------------------------------------
-- Growth analytics schema (persistence only — no collection in PR1b)
-- ---------------------------------------------------------------------------

create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  share_slug text not null,
  event_type text not null check (
    event_type in (
      'view',
      'unique_view',
      'share',
      'share_whatsapp',
      'share_copy',
      'cta_click',
      'registration',
      'conversion',
      'watch_completion'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  visitor_id text,
  created_at timestamptz not null default now()
);

create index if not exists growth_events_share_slug_idx
  on public.growth_events (share_slug);

create index if not exists growth_events_event_type_idx
  on public.growth_events (event_type);

create index if not exists growth_events_created_at_idx
  on public.growth_events (created_at desc);

create index if not exists growth_events_share_slug_event_type_idx
  on public.growth_events (share_slug, event_type);

alter table public.growth_events enable row level security;

-- No client policies — service role inserts only (PR6)
