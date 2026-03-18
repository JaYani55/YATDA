-- Migration: Drop Workspaces table
-- Reverses migration 004_create_workspaces.sql

drop table if exists "YATDA_Workspaces";

-- Drop the trigger that creates personal workspaces for new users
drop trigger if exists trg_yatda_personal_workspace on "YATDA_Users";
drop function if exists yatda_create_personal_workspace();
