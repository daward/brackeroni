alter table parallel_tournament
  add column if not exists play_style play_style not null default 'fixed_bracket';