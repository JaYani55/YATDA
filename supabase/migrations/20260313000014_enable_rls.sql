-- Migration: Enable RLS and define policies for all YATDA tables
-- Philosophy:
--   • Personal-data tables (YATDA_Users, credentials) lock to auth.uid() = user_id.
--   • Workspace-scoped tables check workspace membership via YATDA_Workspace_Members.
--   • Connectors and seed data are readable by all authenticated users.

-- ─── Helper: is the current user a member of this workspace? ───────────────
create or replace function yatda_is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from "YATDA_Workspace_Members"
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
  );
$$;

-- Helper: is the current user an admin of this workspace?
create or replace function yatda_is_workspace_admin(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from "YATDA_Workspace_Members"
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- ─── YATDA_Connectors ──────────────────────────────────────────────────────
alter table "YATDA_Connectors" enable row level security;

create policy "connectors_select_authenticated"
  on "YATDA_Connectors" for select
  to authenticated
  using (true);

-- ─── YATDA_Users ───────────────────────────────────────────────────────────
alter table "YATDA_Users" enable row level security;

create policy "users_select_own"
  on "YATDA_Users" for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Allow workspace members to see each other's profiles
create policy "users_select_workspace_peer"
  on "YATDA_Users" for select
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Workspace_Members" wm1
      join "YATDA_Workspace_Members" wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = (select auth.uid())
        and wm2.user_id = "YATDA_Users".user_id
    )
  );

create policy "users_update_own"
  on "YATDA_Users" for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── YATDA_Workspaces ──────────────────────────────────────────────────────
alter table "YATDA_Workspaces" enable row level security;

create policy "workspaces_select_member"
  on "YATDA_Workspaces" for select
  to authenticated
  using (yatda_is_workspace_member(workspace_id));

create policy "workspaces_insert_owner"
  on "YATDA_Workspaces" for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "workspaces_update_admin"
  on "YATDA_Workspaces" for update
  to authenticated
  using (yatda_is_workspace_admin(workspace_id))
  with check (yatda_is_workspace_admin(workspace_id));

create policy "workspaces_delete_owner"
  on "YATDA_Workspaces" for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ─── YATDA_Workspace_Members ───────────────────────────────────────────────
alter table "YATDA_Workspace_Members" enable row level security;

create policy "wm_select_member"
  on "YATDA_Workspace_Members" for select
  to authenticated
  using (yatda_is_workspace_member(workspace_id));

create policy "wm_insert_admin"
  on "YATDA_Workspace_Members" for insert
  to authenticated
  with check (yatda_is_workspace_admin(workspace_id));

create policy "wm_delete_admin"
  on "YATDA_Workspace_Members" for delete
  to authenticated
  using (yatda_is_workspace_admin(workspace_id));

-- ─── YATDA_Categories ──────────────────────────────────────────────────────
alter table "YATDA_Categories" enable row level security;

create policy "categories_select_member"
  on "YATDA_Categories" for select
  to authenticated
  using (yatda_is_workspace_member(workspace_id));

create policy "categories_insert_member"
  on "YATDA_Categories" for insert
  to authenticated
  with check (yatda_is_workspace_member(workspace_id));

create policy "categories_update_admin"
  on "YATDA_Categories" for update
  to authenticated
  using (yatda_is_workspace_admin(workspace_id))
  with check (yatda_is_workspace_admin(workspace_id));

create policy "categories_delete_admin"
  on "YATDA_Categories" for delete
  to authenticated
  using (yatda_is_workspace_admin(workspace_id));

-- ─── YATDA_Category_Users ──────────────────────────────────────────────────
alter table "YATDA_Category_Users" enable row level security;

create policy "cat_users_select"
  on "YATDA_Category_Users" for select
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Categories" c
      where c.category_id = "YATDA_Category_Users".category_id
        and yatda_is_workspace_member(c.workspace_id)
    )
  );

create policy "cat_users_insert_admin"
  on "YATDA_Category_Users" for insert
  to authenticated
  with check (
    exists (
      select 1 from "YATDA_Categories" c
      where c.category_id = "YATDA_Category_Users".category_id
        and yatda_is_workspace_admin(c.workspace_id)
    )
  );

create policy "cat_users_delete_admin"
  on "YATDA_Category_Users" for delete
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Categories" c
      where c.category_id = "YATDA_Category_Users".category_id
        and yatda_is_workspace_admin(c.workspace_id)
    )
  );

-- ─── YATDA_Tickets ─────────────────────────────────────────────────────────
alter table "YATDA_Tickets" enable row level security;

create policy "tickets_select_member"
  on "YATDA_Tickets" for select
  to authenticated
  using (yatda_is_workspace_member(workspace_id));

create policy "tickets_insert_member"
  on "YATDA_Tickets" for insert
  to authenticated
  with check (yatda_is_workspace_member(workspace_id));

create policy "tickets_update_member"
  on "YATDA_Tickets" for update
  to authenticated
  using (yatda_is_workspace_member(workspace_id))
  with check (yatda_is_workspace_member(workspace_id));

create policy "tickets_delete_admin"
  on "YATDA_Tickets" for delete
  to authenticated
  using (yatda_is_workspace_admin(workspace_id));

-- ─── YATDA_Ticket_Assignees ────────────────────────────────────────────────
alter table "YATDA_Ticket_Assignees" enable row level security;

create policy "assignees_select_member"
  on "YATDA_Ticket_Assignees" for select
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Ticket_Assignees".ticket_id
        and yatda_is_workspace_member(t.workspace_id)
    )
  );

create policy "assignees_insert_member"
  on "YATDA_Ticket_Assignees" for insert
  to authenticated
  with check (
    exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Ticket_Assignees".ticket_id
        and yatda_is_workspace_member(t.workspace_id)
    )
  );

create policy "assignees_delete_member"
  on "YATDA_Ticket_Assignees" for delete
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Ticket_Assignees".ticket_id
        and yatda_is_workspace_member(t.workspace_id)
    )
  );

-- ─── YATDA_Milestones ──────────────────────────────────────────────────────
alter table "YATDA_Milestones" enable row level security;

create policy "milestones_select_member"
  on "YATDA_Milestones" for select
  to authenticated
  using (yatda_is_workspace_member(workspace_id));

create policy "milestones_insert_member"
  on "YATDA_Milestones" for insert
  to authenticated
  with check (yatda_is_workspace_member(workspace_id));

create policy "milestones_update_admin"
  on "YATDA_Milestones" for update
  to authenticated
  using (yatda_is_workspace_admin(workspace_id))
  with check (yatda_is_workspace_admin(workspace_id));

create policy "milestones_delete_admin"
  on "YATDA_Milestones" for delete
  to authenticated
  using (yatda_is_workspace_admin(workspace_id));

-- ─── YATDA_Comments ────────────────────────────────────────────────────────
alter table "YATDA_Comments" enable row level security;

create policy "comments_select_member"
  on "YATDA_Comments" for select
  to authenticated
  using (
    exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Comments".ticket_id
        and yatda_is_workspace_member(t.workspace_id)
    )
  );

create policy "comments_insert_member"
  on "YATDA_Comments" for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Comments".ticket_id
        and yatda_is_workspace_member(t.workspace_id)
    )
  );

create policy "comments_update_own"
  on "YATDA_Comments" for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "comments_delete_own_or_admin"
  on "YATDA_Comments" for delete
  to authenticated
  using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from "YATDA_Tickets" t
      where t.ticket_id = "YATDA_Comments".ticket_id
        and yatda_is_workspace_admin(t.workspace_id)
    )
  );

-- ─── YATDA_Connector_Credentials ───────────────────────────────────────────
alter table "YATDA_Connector_Credentials" enable row level security;

create policy "credentials_select_own"
  on "YATDA_Connector_Credentials" for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "credentials_insert_own"
  on "YATDA_Connector_Credentials" for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "credentials_update_own"
  on "YATDA_Connector_Credentials" for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "credentials_delete_own"
  on "YATDA_Connector_Credentials" for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── YATDA_External_Task_Map ───────────────────────────────────────────────
alter table "YATDA_External_Task_Map" enable row level security;

create policy "ext_map_select_own"
  on "YATDA_External_Task_Map" for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "ext_map_insert_own"
  on "YATDA_External_Task_Map" for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ext_map_update_own"
  on "YATDA_External_Task_Map" for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "ext_map_delete_own"
  on "YATDA_External_Task_Map" for delete
  to authenticated
  using ((select auth.uid()) = user_id);
