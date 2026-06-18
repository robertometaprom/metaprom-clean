-- Biblioteca V1 schema for Supabase
-- Run this in the Supabase SQL editor or psql connected to your Supabase database.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  original_name text,
  image_url text not null,
  mode text not null,
  ai_instructions text,
  created_at timestamptz not null default now()
);

create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists assets_created_at_idx on assets(created_at desc);
create index if not exists projects_created_at_idx on projects(created_at desc);
