alter table candidate
add column if not exists tags text[] not null default '{}';
