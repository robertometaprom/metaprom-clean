-- GTM #2: purchases and paid asset columns are server-owned.
-- Authenticated clients may read their own purchases; they must not insert,
-- update, or spoof payment/Premium state.

drop policy if exists "purchases_insert_own" on public.purchases;
drop policy if exists "purchases_update_own" on public.purchases;

revoke insert, update, delete on table public.purchases from authenticated;
grant select on table public.purchases to authenticated;
grant all on table public.purchases to service_role;

do $$
declare
  purchases_id_sequence regclass;
begin
  purchases_id_sequence := pg_get_serial_sequence('public.purchases', 'id')::regclass;
  if purchases_id_sequence is not null then
    execute format('revoke usage, select on sequence %s from authenticated', purchases_id_sequence);
    execute format('grant usage, select on sequence %s to service_role', purchases_id_sequence);
  end if;
end;
$$;

create or replace function public.protect_paid_asset_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.payment_status, 'none') is distinct from 'none'
       or new.premium_video_path is not null then
      raise exception 'payment_status and premium_video_path cannot be set by clients'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (
       new.payment_status is distinct from old.payment_status
       or new.premium_video_path is distinct from old.premium_video_path
     ) then
    raise exception 'payment_status and premium_video_path cannot be updated by clients'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_paid_asset_columns on public.assets;
create trigger protect_paid_asset_columns
  before insert or update on public.assets
  for each row
  execute function public.protect_paid_asset_columns();

notify pgrst, 'reload schema';
