-- Product intelligence for unmapped Creative Director requests.
-- Stores structured data only — no conversation content, no user profiling.

create table if not exists public.product_intelligence (
  id uuid primary key default gen_random_uuid(),
  requested_service text not null,
  industry text,
  intended_destination text,
  matched_workflow boolean not null default false,
  workflow_id text,
  created_at timestamptz not null default now()
);

alter table public.product_intelligence enable row level security;

-- Authenticated users may insert intelligence records (anonymous structured data).
drop policy if exists "product_intelligence_insert_authenticated" on public.product_intelligence;
create policy "product_intelligence_insert_authenticated"
  on public.product_intelligence
  for insert
  to authenticated
  with check (true);

-- No select/update/delete for authenticated users — admin/service role only.
