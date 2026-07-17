alter table tournament_round
  add column if not exists revealed_at timestamptz;

update tournament_round
set revealed_at = coalesce(closed_at, updated_at, now())
where status = 'closed'
  and revealed_at is null;
