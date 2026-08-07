-- Idempotent commercial consume: one ledger debit per premium commercial asset.
-- Mirrors consume_advertising_asset_on_first_persist / unique-violation rollback.

-- One Commercial entitlement per asset_id (retries / double-click must not double-charge).
create unique index if not exists entitlement_ledger_commercial_asset_consume_uidx
  on public.entitlement_ledger(asset_id)
  where entry_type = 'consume'
    and entitlement_kind = 'commercial'
    and asset_id is not null;

/**
 * Consume exactly one commercial entitlement for a Premium Commercial asset.
 * Returns true when a new consume was applied; false when already consumed for asset_id.
 * Raises P0001 when balance is insufficient (and no prior consume exists).
 */
create or replace function public.consume_commercial_for_asset(
  p_user_id uuid,
  p_asset_id bigint,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_asset_id is null then
    raise exception 'asset_id is required for commercial consume';
  end if;

  insert into public.entitlement_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Idempotent when this asset was already billed, even if balance is now 0.
  if exists (
    select 1
    from public.entitlement_ledger
    where entry_type = 'consume'
      and entitlement_kind = 'commercial'
      and asset_id = p_asset_id
  ) then
    return false;
  end if;

  begin
    update public.entitlement_balances
    set commercials_remaining = commercials_remaining - 1
    where user_id = p_user_id
      and commercials_remaining >= 1
    returning commercials_remaining into v_balance;

    if v_balance is null then
      raise exception 'insufficient commercial entitlement balance'
        using errcode = 'P0001';
    end if;

    insert into public.entitlement_ledger (
      user_id,
      entry_type,
      entitlement_kind,
      quantity,
      balance_after,
      asset_id,
      product_id,
      metadata
    ) values (
      p_user_id,
      'consume',
      'commercial',
      -1,
      v_balance,
      p_asset_id,
      null,
      coalesce(p_metadata, '{}'::jsonb)
    );

    return true;
  exception
    when unique_violation then
      -- Concurrent consume for the same asset_id: debit rolled back.
      return false;
  end;
end;
$$;

revoke all on function public.consume_commercial_for_asset(uuid, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.consume_commercial_for_asset(uuid, bigint, jsonb)
  to service_role;

notify pgrst, 'reload schema';
