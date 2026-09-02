-- Anonymous commercial preview public identity (share_slug on unclaimed drafts)

alter table if exists public.studio_drafts
  add column if not exists share_slug text;

create unique index if not exists studio_drafts_share_slug_idx
  on public.studio_drafts (share_slug)
  where share_slug is not null;
