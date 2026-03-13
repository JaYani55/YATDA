-- Migration: YATDA_Tickets
-- Core ticket table. Status follows the Kanban pipeline.
-- Phase timestamps record when each status was first entered.
-- ticket_points: story-point-style effort estimate.

create type ticket_status_enum as enum (
  'backlog',
  'assigned',
  'in_progress',
  'review',
  'done'
);

create table "YATDA_Tickets" (
  ticket_id          uuid primary key default uuid_generate_v4(),
  workspace_id       uuid not null references "YATDA_Workspaces" (workspace_id) on delete cascade,
  category_id        uuid references "YATDA_Categories" (category_id) on delete set null,
  ticket_name        text not null,
  ticket_description text,
  ticket_status      ticket_status_enum not null default 'backlog',
  ticket_points      integer check (ticket_points >= 0),  -- story points / effort
  ticket_date        date,            -- start / creation date of the task
  ticket_due         timestamptz,     -- due date + optional time
  -- Phase entry timestamps (set once, never reset)
  phase_backlog_at     timestamptz,
  phase_assigned_at    timestamptz,
  phase_in_progress_at timestamptz,
  phase_review_at      timestamptz,
  phase_done_at        timestamptz,
  -- Positional order within its status column (for Kanban drag ordering)
  sort_order         integer not null default 0,
  created_by         uuid references "YATDA_Users" (user_id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table "YATDA_Tickets" is 'Core task/ticket records';
comment on column "YATDA_Tickets".ticket_points is 'Story-point estimate; used for gamification and sprint planning';
comment on column "YATDA_Tickets".sort_order is 'Manual ordering position within a Kanban column';

create index idx_tickets_workspace on "YATDA_Tickets" (workspace_id);
create index idx_tickets_status on "YATDA_Tickets" (workspace_id, ticket_status);
create index idx_tickets_due on "YATDA_Tickets" (ticket_due) where ticket_due is not null;
create index idx_tickets_category on "YATDA_Tickets" (category_id);

create trigger trg_yatda_tickets_updated_at
  before update on "YATDA_Tickets"
  for each row execute function yatda_set_updated_at();

-- Automatically stamp phase timestamps when status changes
create or replace function yatda_stamp_phase_timestamp()
returns trigger language plpgsql as $$
begin
  if new.ticket_status <> old.ticket_status or old.ticket_status is null then
    case new.ticket_status
      when 'backlog'     then
        if new.phase_backlog_at is null then new.phase_backlog_at = now(); end if;
      when 'assigned'    then
        if new.phase_assigned_at is null then new.phase_assigned_at = now(); end if;
      when 'in_progress' then
        if new.phase_in_progress_at is null then new.phase_in_progress_at = now(); end if;
      when 'review'      then
        if new.phase_review_at is null then new.phase_review_at = now(); end if;
      when 'done'        then
        if new.phase_done_at is null then new.phase_done_at = now(); end if;
    end case;
  end if;
  return new;
end;
$$;

create trigger trg_yatda_ticket_phase_stamp
  before insert or update of ticket_status on "YATDA_Tickets"
  for each row execute function yatda_stamp_phase_timestamp();
