alter table candidate_pool
  add column if not exists archived_at timestamptz;

create index if not exists candidate_pool_archived_at_idx on candidate_pool (archived_at);
