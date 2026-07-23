create extension if not exists "pgcrypto";

create type sharing_mode as enum ('private', 'with_friends');
create type play_style as enum ('reseed', 'fixed_bracket');
create type result_mode as enum ('winner_only', 'full_ranking');
create type tie_break_mode as enum ('higher_seed_wins', 'random');
create type tournament_status as enum ('draft', 'active', 'complete');
create type round_closure_mode as enum ('manual', 'all_votes_received', 'automatic_when_settled');
create type invite_status as enum ('pending', 'locked');
create type round_status as enum ('pending', 'active', 'closed');
create type match_status as enum ('pending', 'open', 'closed', 'auto_resolved');
create type resolution_source as enum ('vote', 'bye', 'prior_result', 'tie_break');

create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image_url text,
  google_subject text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table candidate (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references app_user(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidate_creator_user_id_idx on candidate (creator_user_id);
create index candidate_creator_user_id_name_idx on candidate (creator_user_id, name);

create table candidate_pool (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references app_user(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidate_pool_creator_user_id_idx on candidate_pool (creator_user_id);

create table candidate_pool_item (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references candidate_pool(id) on delete cascade,
  candidate_id uuid not null references candidate(id) on delete cascade,
  display_order integer,
  created_at timestamptz not null default now(),
  unique (pool_id, candidate_id)
);

create index candidate_pool_item_pool_id_idx on candidate_pool_item (pool_id);

create table tournament (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references app_user(id) on delete cascade,
  title text not null,
  description text,
  source_pool_id uuid references candidate_pool(id) on delete set null,
  sharing_mode sharing_mode not null,
  play_style play_style not null,
  result_mode result_mode not null,
  tie_break_mode tie_break_mode not null,
  status tournament_status not null default 'draft',
  round_closure_mode round_closure_mode not null,
  seeding_structure jsonb not null default '{}'::jsonb,
  scheduled_close_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    sharing_mode <> 'private'
    or round_closure_mode = 'automatic_when_settled'
  ),
  check (
    sharing_mode <> 'with_friends'
    or round_closure_mode in ('manual', 'all_votes_received')
  )
);

create index tournament_creator_user_id_idx on tournament (creator_user_id);
create index tournament_status_idx on tournament (status);

create table tournament_entry (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournament(id) on delete cascade,
  candidate_id uuid not null references candidate(id) on delete restrict,
  seed integer not null,
  subseed integer not null default 0 check (subseed >= 0),
  final_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, candidate_id),
  unique (tournament_id, seed, subseed)
);

create index tournament_entry_tournament_id_idx on tournament_entry (tournament_id);

create table tournament_invite (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournament(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  status invite_status not null default 'pending',
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index tournament_invite_tournament_id_idx on tournament_invite (tournament_id);

create table share_link (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournament(id) on delete cascade,
  token text not null unique,
  active boolean not null default true,
  created_by_user_id uuid not null references app_user(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index share_link_tournament_id_idx on share_link (tournament_id);

create table tournament_round (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournament(id) on delete cascade,
  sequence_number integer not null,
  status round_status not null default 'pending',
  opened_at timestamptz,
  closed_at timestamptz,
  scheduled_close_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, sequence_number)
);

create index tournament_round_tournament_id_idx on tournament_round (tournament_id);

create table match (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournament(id) on delete cascade,
  round_id uuid not null references tournament_round(id) on delete cascade,
  left_entry_id uuid references tournament_entry(id) on delete set null,
  right_entry_id uuid references tournament_entry(id) on delete set null,
  left_slot_type text not null,
  right_slot_type text not null,
  left_slot_ref text,
  right_slot_ref text,
  status match_status not null default 'pending',
  winner_entry_id uuid references tournament_entry(id) on delete set null,
  resolution_source resolution_source,
  pair_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, pair_key)
);

create index match_round_id_idx on match (round_id);
create index match_tournament_id_idx on match (tournament_id);

create table vote (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  selected_entry_id uuid not null references tournament_entry(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index vote_match_id_idx on vote (match_id);
create index vote_user_id_idx on vote (user_id);
