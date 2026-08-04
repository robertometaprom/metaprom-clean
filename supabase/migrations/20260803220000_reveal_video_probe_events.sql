-- Temporary diagnostics storage for reveal-video mobile probe (RC1 incident).
create table if not exists public.reveal_video_probe_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reveal_video_probe_events_session_id_idx
  on public.reveal_video_probe_events (session_id, created_at desc);

alter table public.reveal_video_probe_events enable row level security;

-- Service role only (same pattern as growth_events).
