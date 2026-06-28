-- Sprint 1: Library storage bucket + full asset metadata
-- Sprint 2: Commercial tiers + purchases

-- ---------------------------------------------------------------------------
-- Storage bucket (private — access via signed URLs or authenticated policies)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library',
  'library',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users read/write only under their own folder: {user_id}/...
create policy if not exists "library_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'library'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "library_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'library'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "library_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'library'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "library_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'library'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Project metadata
-- ---------------------------------------------------------------------------

alter table if exists public.projects
  add column if not exists workflow_id text,
  add column if not exists industry text,
  add column if not exists intended_destination text;

-- ---------------------------------------------------------------------------
-- Asset persistence + commercial tiers
-- ---------------------------------------------------------------------------

alter table if exists public.assets
  add column if not exists original_url text,
  add column if not exists original_path text,
  add column if not exists image_path text,
  add column if not exists image_prompt text,
  add column if not exists video_prompt text,
  add column if not exists teaser_video_url text,
  add column if not exists teaser_video_path text,
  add column if not exists premium_video_url text,
  add column if not exists premium_video_path text,
  add column if not exists payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid')),
  add column if not exists workflow_id text,
  add column if not exists industry text;

-- Backfill teaser from legacy video_url
update public.assets
set teaser_video_url = video_url
where teaser_video_url is null and video_url is not null;

-- ---------------------------------------------------------------------------
-- Purchases (provider-agnostic)
-- ---------------------------------------------------------------------------

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  product_id text not null,
  amount_mxn integer not null,
  currency text not null default 'MXN',
  status text not null default 'pending'
    check (status in ('pending', 'awaiting_payment', 'completed', 'failed', 'cancelled')),
  provider text not null,
  provider_reference text,
  payment_method text check (payment_method in ('card', 'oxxo', 'spei', 'wallet', 'other')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_asset_id_idx on public.purchases(asset_id);
create index if not exists purchases_status_idx on public.purchases(status);

alter table if exists public.purchases enable row level security;

create policy if not exists "purchases_select_own"
  on public.purchases for select to authenticated
  using (user_id = auth.uid());

create policy if not exists "purchases_insert_own"
  on public.purchases for insert to authenticated
  with check (user_id = auth.uid());

create policy if not exists "purchases_update_own"
  on public.purchases for update to authenticated
  using (user_id = auth.uid());
