-- Production destination (platform + aspect ratio) captured before generation.
alter table if exists public.projects
  add column if not exists destination jsonb;
