alter table tournament
  add column if not exists seeding_structure jsonb not null default '{}'::jsonb;
