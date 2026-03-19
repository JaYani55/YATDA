-- Down migration: revert named FK constraints on YATDA_Ticket_Assignees

alter table "YATDA_Ticket_Assignees"
  drop constraint "fk_ticket_assignees_assignee",
  add  constraint "YATDA_Ticket_Assignees_user_id_fkey"
       foreign key (user_id) references "YATDA_Users" (user_id) on delete cascade;

alter table "YATDA_Ticket_Assignees"
  drop constraint "fk_ticket_assignees_assigner",
  add  constraint "YATDA_Ticket_Assignees_assigned_by_fkey"
       foreign key (assigned_by) references "YATDA_Users" (user_id) on delete set null;
