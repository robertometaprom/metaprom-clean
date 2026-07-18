-- Biblioteca schema for Supabase (reference — apply migrations in supabase/migrations/)

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  user_id uuid references auth.users(id),
  workflow_id text,
  industry text,
  intended_destination text,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  original_name text,
  original_url text,
  original_path text,
  image_url text not null,
  image_path text,
  video_url text,
  teaser_video_url text,
  teaser_video_path text,
  premium_video_url text,
  premium_video_path text,
  share_slug text,
  visibility text not null default 'public'
    check (visibility in ('public', 'unlisted', 'private')),
  image_prompt text,
  video_prompt text,
  mode text not null,
  ai_instructions text,
  workflow_id text,
  industry text,
  payment_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assets_share_slug_idx
  on assets(share_slug)
  where share_slug is not null;

create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists assets_created_at_idx on assets(created_at desc);
create index if not exists projects_created_at_idx on projects(created_at desc);
