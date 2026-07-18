alter table candidate_pool
  add column if not exists enrichment_cursor_display_order integer;
