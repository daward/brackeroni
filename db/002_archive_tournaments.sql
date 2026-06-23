alter table tournament
  add column if not exists archived_at timestamptz;

create index if not exists tournament_archived_at_idx on tournament (archived_at);
