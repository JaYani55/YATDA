-- Migration: YATDA_Milestones
-- Timeline marker events shown on the board header (the numbered bubbles in the screenshot).
-- milestone_date drives the position on the horizontal timeline.

create table "YATDA_Milestones" (
  milestone_id    uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references "YATDA_Workspaces" (workspace_id) on delete cascade,
  milestone_name  text not null,
  milestone_date  date not null,
  milestone_color text not null default '#f59e0b',  -- amber by default
  description     text,
  created_by      uuid references "YATDA_Users" (user_id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table "YATDA_Milestones" is 'Dated milestones shown on the board timeline header';

create index idx_milestones_workspace on "YATDA_Milestones" (workspace_id, milestone_date);

create trigger trg_yatda_milestones_updated_at
  before update on "YATDA_Milestones"
  for each row execute function yatda_set_updated_at();
