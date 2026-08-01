-- Anonymous Studio drafts for login continuity (resume after OAuth)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-drafts',
  'studio-drafts',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/json']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Draft objects are managed exclusively via service role (API routes).

create table if not exists public.studio_drafts (
  id uuid primary key default gen_random_uuid(),
  resume_token text not null unique,
  phase text not null default 'preview',
  customer_intent text,
  image_prompt text,
  video_prompt text,
  workflow_id text,
  industry text,
  intended_destination text,
  destination jsonb,
  product_mode text,
  original_path text,
  original_name text,
  original_content_type text,
  enhanced_path text,
  teaser_path text,
  conversation_history jsonb not null default '[]'::jsonb,
  pending_action text check (pending_action in ('save', 'unlock')),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_drafts_resume_token_idx
  on public.studio_drafts(resume_token);

create index if not exists studio_drafts_expires_at_idx
  on public.studio_drafts(expires_at);

alter table public.studio_drafts enable row level security;

-- No client policies: access only through API routes using service role.
