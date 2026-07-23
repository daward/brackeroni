alter table tournament_entry
  drop constraint if exists tournament_entry_tournament_id_seed_key;

alter table tournament_entry
  add constraint tournament_entry_tournament_id_seed_subseed_key
  unique (tournament_id, seed, subseed);
