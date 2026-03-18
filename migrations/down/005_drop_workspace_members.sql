-- Migration: Drop Workspace Members table
-- Reverses migration 005_create_workspace_members.sql

drop table if exists "YATDA_Workspace_Members";

-- Drop the trigger that creates workspace owner membership
drop trigger if exists trg_yatda_workspace_owner_member on "YATDA_Workspaces";
drop function if exists yatda_add_owner_as_member();
