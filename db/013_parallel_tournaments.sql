do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'parallel_participant_status'
  ) then
    create type parallel_participant_status as enum ('invited', 'active', 'complete');
  end if;
end
$$;

create table if not exists parallel_tournament (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references app_user(id) on delete cascade,
  title text not null,
  description text,
  source_pool_id uuid not null references candidate_pool(id) on delete restrict,
  sharing_mode sharing_mode not null,
  visibility tournament_visibility not null default 'private',
  voting_access voting_access_mode not null default 'signed_in_only',
  tie_break_mode tie_break_mode not null,
  status tournament_status not null default 'draft',
  started_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parallel_tournament_creator_user_id_idx
  on parallel_tournament (creator_user_id);

create index if not exists parallel_tournament_visibility_status_idx
  on parallel_tournament (visibility, status, updated_at desc);

create table if not exists parallel_tournament_participant (
  id uuid primary key default gen_random_uuid(),
  parallel_tournament_id uuid not null references parallel_tournament(id) on delete cascade,
  user_id uuid references app_user(id) on delete cascade,
  anonymous_voter_token text,
  tournament_id uuid references tournament(id) on delete set null,
  status parallel_participant_status not null default 'invited',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parallel_tournament_participant_identity_check
    check (
      (user_id is not null and anonymous_voter_token is null)
      or (user_id is null and anonymous_voter_token is not null)
    ),
  constraint parallel_tournament_participant_tournament_unique
    unique (tournament_id)
);

create index if not exists parallel_tournament_participant_parallel_tournament_id_idx
  on parallel_tournament_participant (parallel_tournament_id);

create unique index if not exists parallel_tournament_participant_user_unique_idx
  on parallel_tournament_participant (parallel_tournament_id, user_id)
  where user_id is not null;

create unique index if not exists parallel_tournament_participant_anonymous_unique_idx
  on parallel_tournament_participant (parallel_tournament_id, anonymous_voter_token)
  where anonymous_voter_token is not null;
