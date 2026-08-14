-- Production drift repair: code has expected structured destination since
-- 20260702120000, but the production column was never applied.
alter table if exists public.projects
  add column if not exists destination jsonb;

-- Immutable commercial recipe. NULL intentionally identifies legacy assets.
alter table if exists public.assets
  add column if not exists creative_recipe jsonb;

comment on column public.assets.creative_recipe is
  'Versioned creative snapshot frozen after a commercial preview is persisted; NULL means legacy/incomplete.';
