alter table tournament_entry
  drop constraint if exists tournament_entry_tournament_id_seed_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'tournament_entry'::regclass
      and conname = 'tournament_entry_tournament_id_seed_subseed_key'
  ) then
    alter table tournament_entry
      add constraint tournament_entry_tournament_id_seed_subseed_key
      unique (tournament_id, seed, subseed);
  end if;
end
$$;