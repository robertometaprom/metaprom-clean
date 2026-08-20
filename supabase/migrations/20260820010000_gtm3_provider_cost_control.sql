-- GTM #3: durable provider-cost windows and Premium generation locks.
-- Service-role / server only. Stores hashed identities, never raw IPs,
-- tokens, prompts, or uploaded media.

create table if not exists public.provider_cost_windows (
  endpoint_class text not null,
  bucket_key text not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  last_decision text not null default 'allowed',
  updated_at timestamptz not null default now(),
  primary key (endpoint_class, bucket_key, window_started_at),
  constraint provider_cost_windows_class_check
    check (endpoint_class ~ '^[a-z0-9-]{1,64}$'),
  constraint provider_cost_windows_key_check
    check (bucket_key ~ '^[a-f0-9]{64}$'),
  constraint provider_cost_windows_decision_check
    check (last_decision in ('allowed', 'blocked')),
  constraint provider_cost_windows_count_check
    check (hit_count >= 0)
);

create index if not exists provider_cost_windows_updated_at_idx
  on public.provider_cost_windows (updated_at desc);

alter table public.provider_cost_windows enable row level security;

revoke all on table public.provider_cost_windows
  from public, anon, authenticated;
grant all on table public.provider_cost_windows to service_role;

create table if not exists public.provider_cost_locks (
  lock_key text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint provider_cost_locks_key_check
    check (lock_key ~ '^[a-f0-9]{64}$')
);

create index if not exists provider_cost_locks_expires_at_idx
  on public.provider_cost_locks (expires_at);

alter table public.provider_cost_locks enable row level security;

revoke all on table public.provider_cost_locks
  from public, anon, authenticated;
grant all on table public.provider_cost_locks to service_role;

create or replace function public.consume_provider_cost_window(
  p_endpoint_class text,
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_allowed boolean;
  v_retry_after integer;
  v_epoch integer;
begin
  if p_endpoint_class is null or p_endpoint_class !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'invalid endpoint class';
  end if;
  if p_bucket_key is null or p_bucket_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid bucket key';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid window';
  end if;

  v_epoch := floor(extract(epoch from now()))::integer;
  v_window_start := to_timestamp(
    (floor(v_epoch::numeric / p_window_seconds) * p_window_seconds)::double precision
  );
  v_retry_after := greatest(1, p_window_seconds - (v_epoch % p_window_seconds));

  insert into public.provider_cost_windows (
    endpoint_class,
    bucket_key,
    window_started_at,
    hit_count,
    last_decision,
    updated_at
  ) values (
    p_endpoint_class,
    p_bucket_key,
    v_window_start,
    1,
    'allowed',
    now()
  )
  on conflict (endpoint_class, bucket_key, window_started_at)
  do update set
    hit_count = public.provider_cost_windows.hit_count + 1,
    last_decision = case
      when public.provider_cost_windows.hit_count + 1 <= p_limit then 'allowed'
      else 'blocked'
    end,
    updated_at = now()
  returning hit_count into v_count;

  v_allowed := v_count <= p_limit;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(p_limit - v_count, 0),
    'retryAfterSeconds', v_retry_after,
    'count', v_count
  );
end;
$$;

create or replace function public.claim_provider_cost_lock(
  p_lock_key text,
  p_ttl_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retry integer;
begin
  if p_lock_key is null or p_lock_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid lock key';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 3600 then
    raise exception 'invalid ttl';
  end if;

  delete from public.provider_cost_locks
  where lock_key = p_lock_key
    and expires_at <= now();

  begin
    insert into public.provider_cost_locks (lock_key, expires_at)
    values (p_lock_key, now() + make_interval(secs => p_ttl_seconds));

    return jsonb_build_object(
      'claimed', true,
      'retryAfterSeconds', p_ttl_seconds
    );
  exception
    when unique_violation then
      select greatest(1, ceil(extract(epoch from (expires_at - now()))))::integer
        into v_retry
      from public.provider_cost_locks
      where lock_key = p_lock_key;

      return jsonb_build_object(
        'claimed', false,
        'retryAfterSeconds', coalesce(v_retry, 1)
      );
  end;
end;
$$;

create or replace function public.release_provider_cost_lock(
  p_lock_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lock_key is null or p_lock_key !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  delete from public.provider_cost_locks
  where lock_key = p_lock_key;
end;
$$;

revoke all on function public.consume_provider_cost_window(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_provider_cost_window(text, text, integer, integer)
  to service_role;

revoke all on function public.claim_provider_cost_lock(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_provider_cost_lock(text, integer)
  to service_role;

revoke all on function public.release_provider_cost_lock(text)
  from public, anon, authenticated;
grant execute on function public.release_provider_cost_lock(text)
  to service_role;

notify pgrst, 'reload schema';
