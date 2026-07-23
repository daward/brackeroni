alter table tournament_entry
  add column if not exists subseed integer not null default 0;

alter table tournament_entry
  add constraint tournament_entry_subseed_nonnegative
  check (subseed >= 0);
