-- Internal, service-role-only discretionary entitlement grants.
-- Separate from Stripe purchases and auditable in entitlement_ledger.

alter table public.entitlement_ledger
  add column if not exists admin_grant_id uuid;

create unique index if not exists entitlement_ledger_admin_grant_uidx
  on public.entitlement_ledger(admin_grant_id)
  where admin_grant_id is not null;

create or replace function public.admin_grant_entitlement(
  p_request_id uuid,
  p_user_id uuid,
  p_entitlement_kind text,
  p_quantity integer,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(granted boolean, balance_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_existing_balance integer;
begin
  if p_request_id is null then
    raise exception 'request id is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'grant quantity must be positive';
  end if;

  if p_entitlement_kind not in ('commercial', 'advertising_asset') then
    raise exception 'invalid entitlement kind: %', p_entitlement_kind;
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'grant reason is required';
  end if;

  select l.balance_after
    into v_existing_balance
  from public.entitlement_ledger l
  where l.admin_grant_id = p_request_id;

  if found then
    return query select false, v_existing_balance;
    return;
  end if;

  insert into public.entitlement_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if p_entitlement_kind = 'commercial' then
    update public.entitlement_balances
    set commercials_remaining = commercials_remaining + p_quantity
    where user_id = p_user_id
    returning commercials_remaining into v_balance;
  else
    update public.entitlement_balances
    set advertising_assets_remaining = advertising_assets_remaining + p_quantity
    where user_id = p_user_id
    returning advertising_assets_remaining into v_balance;
  end if;

  insert into public.entitlement_ledger (
    user_id,
    entry_type,
    entitlement_kind,
    quantity,
    balance_after,
    admin_grant_id,
    metadata
  ) values (
    p_user_id,
    'adjust',
    p_entitlement_kind,
    p_quantity,
    v_balance,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('reason', btrim(p_reason))
  );

  return query select true, v_balance;
end;
$$;

revoke all on function public.admin_grant_entitlement(uuid, uuid, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_grant_entitlement(uuid, uuid, text, integer, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';
