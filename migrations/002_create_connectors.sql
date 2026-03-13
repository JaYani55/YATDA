-- Migration: YATDA_Connectors
-- Represents external task providers (e.g. Google Tasks, Jira).
-- connector_id is a stable slug (e.g. 'google-tasks') used in code.

create table "YATDA_Connectors" (
  connector_id   uuid primary key default uuid_generate_v4(),
  connector_slug text not null unique,   -- e.g. 'google-tasks'
  connector_name text not null,          -- display name
  connector_color text not null default '#6366f1',  -- hex color for UI badges
  created_at     timestamptz not null default now()
);

comment on table "YATDA_Connectors" is 'External task provider integrations (Google Tasks, etc.)';

-- Seed the Google Tasks connector
insert into "YATDA_Connectors" (connector_slug, connector_name, connector_color)
values ('google-tasks', 'Google Tasks', '#4285F4');
