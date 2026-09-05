-- Generation Pipeline V2 — durable product jobs (Phase 1).
-- Parallel to legacy Commercial pipeline. Service-role / server only.
-- Workflow SDK run ids are correlation only; this table is product truth.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  ownership_scope text not null,
  idempotency_key text not null,
  status text not null default 'created',
  attempt_image integer not null default 0,
  attempt_video integer not null default 0,
  attempt_persist integer not null default 0,
  request jsonb not null,
  artifacts jsonb not null default '{}'::jsonb,
  error jsonb,
  workflow_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  failed_at timestamptz,

  constraint generation_jobs_status_check
    check (status in (
      'created',
      'image_generating',
      'image_ready',
      'video_generating',
      'video_ready',
      'persisting',
      'ready',
      'failed'
    )),
  constraint generation_jobs_request_object_check
    check (jsonb_typeof(request) = 'object'),
  constraint generation_jobs_artifacts_object_check
    check (jsonb_typeof(artifacts) = 'object'),
  constraint generation_jobs_ownership_idempotency_key
    unique (ownership_scope, idempotency_key)
);

create index if not exists generation_jobs_status_idx
  on public.generation_jobs (status);

create index if not exists generation_jobs_created_at_idx
  on public.generation_jobs (created_at desc);

create index if not exists generation_jobs_updated_at_idx
  on public.generation_jobs (updated_at desc);

create index if not exists generation_jobs_workflow_run_id_idx
  on public.generation_jobs (workflow_run_id)
  where workflow_run_id is not null;

alter table public.generation_jobs enable row level security;

revoke all on table public.generation_jobs
  from public, anon, authenticated;
grant all on table public.generation_jobs to service_role;
