create table if not exists bracket_template (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references app_user(id) on delete cascade,
  name text not null,
  description text,
  built_in_key text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bracket_template_user_name_idx
  on bracket_template (creator_user_id, lower(name))
  where archived_at is null;

create table if not exists bracket_template_sub_bracket (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references bracket_template(id) on delete cascade,
  name text not null,
  tag text,
  slot_count integer not null check (slot_count between 2 and 128),
  feed_order integer not null default 1 check (feed_order between 1 and 64),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bracket_template_sub_bracket_template_order_idx
  on bracket_template_sub_bracket (template_id, display_order, id);

create table if not exists bracket_template_slot (
  id uuid primary key default gen_random_uuid(),
  sub_bracket_id uuid not null references bracket_template_sub_bracket(id) on delete cascade,
  seed integer not null check (seed between 1 and 128),
  subseed integer not null default 0 check (subseed between 0 and 32),
  tag text,
  template_slot integer not null default 0 check (template_slot between 0 and 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bracket_template_slot_sub_bracket_seed_idx
  on bracket_template_slot (sub_bracket_id, seed, subseed);

create unique index if not exists bracket_template_slot_sub_bracket_position_idx
  on bracket_template_slot (sub_bracket_id, template_slot);
