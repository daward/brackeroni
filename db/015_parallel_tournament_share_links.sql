alter table share_link
  add column if not exists parallel_tournament_id uuid references parallel_tournament(id) on delete cascade;

alter table share_link
  alter column tournament_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'share_link_target_check'
  ) then
    alter table share_link
      add constraint share_link_target_check
      check (
        (tournament_id is not null and parallel_tournament_id is null)
        or (tournament_id is null and parallel_tournament_id is not null)
      );
  end if;
end
$$;

create index if not exists share_link_parallel_tournament_id_idx
  on share_link (parallel_tournament_id);
