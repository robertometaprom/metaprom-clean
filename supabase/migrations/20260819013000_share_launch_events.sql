-- P1-4 Share launch events: persist share_created and share_opened
-- on the existing growth_events table. Does not add share_to_signup.

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'growth_events'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%event_type%';

  if constraint_name is not null then
    execute format(
      'alter table public.growth_events drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.growth_events
  add constraint growth_events_event_type_check
  check (
    event_type in (
      'view',
      'unique_view',
      'share',
      'share_whatsapp',
      'share_copy',
      'share_created',
      'share_opened',
      'cta_click',
      'registration',
      'conversion',
      'watch_completion'
    )
  );
