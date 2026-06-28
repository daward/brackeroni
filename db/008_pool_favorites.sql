alter table candidate_pool
  add column if not exists source_pool_id uuid references candidate_pool(id) on delete set null;

create index if not exists candidate_pool_source_pool_id_idx
  on candidate_pool (source_pool_id);
