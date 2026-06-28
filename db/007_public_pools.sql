do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'pool_visibility'
  ) then
    create type pool_visibility as enum ('private', 'public_listed', 'public_unlisted');
  end if;
end
$$;

alter table candidate_pool
  add column if not exists visibility pool_visibility not null default 'private',
  add column if not exists published_at timestamptz;

create index if not exists candidate_pool_visibility_idx
  on candidate_pool (visibility, archived_at, updated_at desc);
