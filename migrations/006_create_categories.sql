-- Migration: YATDA_Categories
-- Categories (tags/labels) group related tickets within a workspace.
-- Equivalent to JIRA epics or labels.

create table "YATDA_Categories" (
  category_id          uuid primary key default uuid_generate_v4(),
  workspace_id         uuid not null references "YATDA_Workspaces" (workspace_id) on delete cascade,
  category_name        text not null,
  category_color       text not null default '#6366f1',  -- hex
  category_description text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (workspace_id, category_name)
);

comment on table "YATDA_Categories" is 'Labels/categories for grouping tickets within a workspace';

drop trigger if exists trg_yatda_categories_updated_at on "YATDA_Categories";
create trigger trg_yatda_categories_updated_at
  before update on "YATDA_Categories"
  for each row execute function yatda_set_updated_at();
