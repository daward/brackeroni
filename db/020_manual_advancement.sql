create type advancement_mode as enum ('vote_winner', 'manual_winner');

alter type resolution_source add value if not exists 'manual_result';

alter table tournament
  add column if not exists advancement_mode advancement_mode;

update tournament
set advancement_mode = coalesce(advancement_mode, 'vote_winner'::advancement_mode);

alter table tournament
  alter column advancement_mode set default 'vote_winner'::advancement_mode;

alter table tournament
  alter column advancement_mode set not null;
