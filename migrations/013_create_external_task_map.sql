-- Migration: YATDA_External_Task_Map
-- Bidirectional sync mapping: links a YATDA ticket to an external task ID.
-- sync_hash is a SHA-256 hex digest of the external task's serialized fields; used to detect
-- changes without fetching and comparing full objects every time.

create table "YATDA_External_Task_Map" (
  map_id           uuid primary key default uuid_generate_v4(),
  ticket_id        uuid not null references "YATDA_Tickets" (ticket_id) on delete cascade,
  connector_id     uuid not null references "YATDA_Connectors" (connector_id) on delete cascade,
  user_id          uuid not null references "YATDA_Users" (user_id) on delete cascade,
  external_task_id text not null,    -- e.g. Google Tasks task ID
  external_list_id text,             -- e.g. Google Tasks list ID / tasklist ID
  sync_hash        text check (sync_hash is null or length(sync_hash) = 64),  -- SHA-256 hex digest, for change detection
  last_synced_at   timestamptz,
  sync_direction   text not null default 'bidirectional'
                     check (sync_direction in ('inbound', 'outbound', 'bidirectional')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (connector_id, user_id, external_task_id)
);

comment on table "YATDA_External_Task_Map" is 'Maps YATDA tickets to external connector task IDs for bidirectional sync';
comment on column "YATDA_External_Task_Map".sync_hash is 'Hash of last-seen external task state; skip sync when unchanged';

create index idx_external_map_ticket on "YATDA_External_Task_Map" (ticket_id);
create index idx_external_map_connector_user on "YATDA_External_Task_Map" (connector_id, user_id);

drop trigger if exists trg_yatda_external_map_updated_at on "YATDA_External_Task_Map";
create trigger trg_yatda_external_map_updated_at
  before update on "YATDA_External_Task_Map"
  for each row execute function yatda_set_updated_at();
