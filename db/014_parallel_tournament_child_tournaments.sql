alter table tournament
  add column if not exists parent_parallel_tournament_id uuid references parallel_tournament(id) on delete set null;

create index if not exists tournament_parent_parallel_tournament_id_idx
  on tournament (parent_parallel_tournament_id);
