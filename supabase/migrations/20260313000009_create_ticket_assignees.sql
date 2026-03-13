-- Migration: YATDA_Ticket_Assignees
-- Many-to-many: a ticket can have multiple assignees.

create table "YATDA_Ticket_Assignees" (
  ticket_id   uuid not null references "YATDA_Tickets" (ticket_id) on delete cascade,
  user_id     uuid not null references "YATDA_Users" (user_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references "YATDA_Users" (user_id) on delete set null,
  primary key (ticket_id, user_id)
);

comment on table "YATDA_Ticket_Assignees" is 'Many-to-many assignment of users to tickets';

create index idx_ticket_assignees_user on "YATDA_Ticket_Assignees" (user_id);
