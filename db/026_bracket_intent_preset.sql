alter table tournament
  add column if not exists intent_preset text;

alter table parallel_tournament
  add column if not exists intent_preset text;

create index if not exists tournament_intent_preset_idx
  on tournament (intent_preset)
  where intent_preset is not null;

create index if not exists parallel_tournament_intent_preset_idx
  on parallel_tournament (intent_preset)
  where intent_preset is not null;
