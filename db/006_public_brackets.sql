create type tournament_visibility as enum ('private', 'public_listed', 'public_unlisted');
create type voting_access_mode as enum ('signed_in_only', 'anyone');

alter table tournament
  add column if not exists visibility tournament_visibility not null default 'private',
  add column if not exists voting_access voting_access_mode not null default 'signed_in_only',
  add column if not exists last_vote_at timestamptz;

create index if not exists tournament_visibility_status_idx
  on tournament (visibility, status, updated_at desc);

alter table vote
  alter column user_id drop not null;

alter table vote
  add column if not exists anonymous_voter_token text;

alter table vote
  drop constraint if exists vote_match_id_user_id_key;

alter table vote
  add constraint vote_has_identity_check
  check (
    (user_id is not null and anonymous_voter_token is null)
    or (user_id is null and anonymous_voter_token is not null)
  );

create unique index if not exists vote_match_user_unique_idx
  on vote (match_id, user_id)
  where user_id is not null;

create unique index if not exists vote_match_anonymous_token_unique_idx
  on vote (match_id, anonymous_voter_token)
  where anonymous_voter_token is not null;

create index if not exists vote_anonymous_voter_token_idx
  on vote (anonymous_voter_token)
  where anonymous_voter_token is not null;
