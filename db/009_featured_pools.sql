alter table candidate_pool
  add column if not exists featured_on_home boolean not null default false;

create index if not exists candidate_pool_featured_on_home_idx
  on candidate_pool (featured_on_home, visibility, archived_at, published_at desc, updated_at desc);
