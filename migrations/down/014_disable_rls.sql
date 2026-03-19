-- Migration: Disable RLS on all YATDA tables
-- Reverses migration 014_enable_rls.sql

-- Drop all RLS policies
drop policy if exists "connectors_select_authenticated" on "YATDA_Connectors";

drop policy if exists "users_select_own" on "YATDA_Users";
drop policy if exists "users_select_workspace_peer" on "YATDA_Users";
drop policy if exists "users_update_own" on "YATDA_Users";
drop policy if exists "users_insert_own" on "YATDA_Users";

drop policy if exists "workspaces_select_member" on "YATDA_Workspaces";
drop policy if exists "workspaces_insert_owner" on "YATDA_Workspaces";
drop policy if exists "workspaces_update_admin" on "YATDA_Workspaces";
drop policy if exists "workspaces_delete_owner" on "YATDA_Workspaces";

drop policy if exists "wm_select_member" on "YATDA_Workspace_Members";
drop policy if exists "wm_insert_admin" on "YATDA_Workspace_Members";
drop policy if exists "wm_delete_admin" on "YATDA_Workspace_Members";
drop policy if exists "wm_update_admin" on "YATDA_Workspace_Members";

drop policy if exists "categories_select_member" on "YATDA_Categories";
drop policy if exists "categories_insert_member" on "YATDA_Categories";
drop policy if exists "categories_update_admin" on "YATDA_Categories";
drop policy if exists "categories_delete_admin" on "YATDA_Categories";

drop policy if exists "cat_users_select" on "YATDA_Category_Users";
drop policy if exists "cat_users_insert_admin" on "YATDA_Category_Users";
drop policy if exists "cat_users_delete_admin" on "YATDA_Category_Users";

drop policy if exists "tickets_select_member" on "YATDA_Tickets";
drop policy if exists "tickets_insert_member" on "YATDA_Tickets";
drop policy if exists "tickets_update_member" on "YATDA_Tickets";
drop policy if exists "tickets_delete_admin" on "YATDA_Tickets";

drop policy if exists "assignees_select_member" on "YATDA_Ticket_Assignees";
drop policy if exists "assignees_insert_member" on "YATDA_Ticket_Assignees";
drop policy if exists "assignees_delete_member" on "YATDA_Ticket_Assignees";

drop policy if exists "milestones_select_member" on "YATDA_Milestones";
drop policy if exists "milestones_insert_member" on "YATDA_Milestones";
drop policy if exists "milestones_update_admin" on "YATDA_Milestones";
drop policy if exists "milestones_delete_admin" on "YATDA_Milestones";

drop policy if exists "comments_select_member" on "YATDA_Comments";
drop policy if exists "comments_insert_member" on "YATDA_Comments";
drop policy if exists "comments_update_own" on "YATDA_Comments";
drop policy if exists "comments_delete_own_or_admin" on "YATDA_Comments";

drop policy if exists "credentials_select_own" on "YATDA_Connector_Credentials";

-- Drop RLS helper functions
drop function if exists yatda_is_workspace_admin(uuid);
drop function if exists yatda_is_workspace_member(uuid);

-- Disable RLS on all tables
alter table "YATDA_Connectors" disable row level security;
alter table "YATDA_Users" disable row level security;
alter table "YATDA_Workspaces" disable row level security;
alter table "YATDA_Workspace_Members" disable row level security;
alter table "YATDA_Categories" disable row level security;
alter table "YATDA_Category_Users" disable row level security;
alter table "YATDA_Tickets" disable row level security;
alter table "YATDA_Ticket_Assignees" disable row level security;
alter table "YATDA_Milestones" disable row level security;
alter table "YATDA_Comments" disable row level security;
alter table "YATDA_Connector_Credentials" disable row level security;
