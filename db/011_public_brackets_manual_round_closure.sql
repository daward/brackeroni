alter table tournament
  drop constraint if exists tournament_round_closure_mode_check,
  drop constraint if exists tournament_public_voting_access_check;

update tournament
set
  round_closure_mode = 'manual',
  voting_access = 'anyone',
  updated_at = now()
where visibility in ('public_listed', 'public_unlisted')
  and (
    round_closure_mode <> 'manual'
    or voting_access <> 'anyone'
  );

alter table tournament
  add constraint tournament_round_closure_mode_check
  check (
    case
      when visibility in ('public_listed', 'public_unlisted') then
        round_closure_mode = 'manual'
      when sharing_mode = 'private' then
        round_closure_mode = 'automatic_when_settled'
      when sharing_mode = 'with_friends' then
        round_closure_mode in ('manual', 'all_votes_received')
      else false
    end
  ),
  add constraint tournament_public_voting_access_check
  check (
    case
      when visibility in ('public_listed', 'public_unlisted') then
        voting_access = 'anyone'
      else true
    end
  );
