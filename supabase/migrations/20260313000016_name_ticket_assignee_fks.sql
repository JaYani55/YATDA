-- Migration: Name the FK constraints on YATDA_Ticket_Assignees
-- Both user_id and assigned_by reference YATDA_Users, creating PostgREST ambiguity.
-- Renaming them to known constraint names lets all PostgREST versions resolve the
-- embed hint via !fk_ticket_assignees_assignee (the user_id path).

alter table "YATDA_Ticket_Assignees"
  drop constraint "YATDA_Ticket_Assignees_user_id_fkey",
  add  constraint "fk_ticket_assignees_assignee"
       foreign key (user_id) references "YATDA_Users" (user_id) on delete cascade;

alter table "YATDA_Ticket_Assignees"
  drop constraint "YATDA_Ticket_Assignees_assigned_by_fkey",
  add  constraint "fk_ticket_assignees_assigner"
       foreign key (assigned_by) references "YATDA_Users" (user_id) on delete set null;
