-- RC1.3.5 PR1: permanent public preview slug (1:1 with asset teaser)

alter table if exists public.assets
  add column if not exists share_slug text;

create unique index if not exists assets_share_slug_idx
  on public.assets (share_slug)
  where share_slug is not null;

-- Backfill slugs for assets that already have a teaser video
do $$
declare
  asset_row record;
  new_slug text;
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  slug_length int := 11;
  char_index int;
  attempt int;
begin
  for asset_row in
    select id
    from public.assets
    where teaser_video_path is not null
      and share_slug is null
  loop
    attempt := 0;
    loop
      new_slug := '';
      for char_index in 1..slug_length loop
        new_slug := new_slug || substr(
          alphabet,
          1 + floor(random() * length(alphabet))::int,
          1
        );
      end loop;

      begin
        update public.assets
        set share_slug = new_slug
        where id = asset_row.id;
        exit;
      exception
        when unique_violation then
          attempt := attempt + 1;
          if attempt >= 12 then
            raise exception 'Failed to generate unique share_slug for asset %', asset_row.id;
          end if;
      end;
    end loop;
  end loop;
end $$;
