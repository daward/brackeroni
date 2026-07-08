alter table candidate_pool
  add column if not exists import_source_url text,
  add column if not exists import_source_title text;

create index if not exists candidate_pool_import_source_url_idx
  on candidate_pool (import_source_url)
  where import_source_url is not null;
