alter table parallel_tournament
  add column if not exists result_mode result_mode;

update parallel_tournament
set result_mode = coalesce(result_mode, 'parallel_full_ranking'::result_mode);

alter table parallel_tournament
  alter column result_mode set default 'parallel_full_ranking'::result_mode;

alter table parallel_tournament
  alter column result_mode set not null;
