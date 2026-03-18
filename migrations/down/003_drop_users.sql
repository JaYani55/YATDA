-- Migration: Drop Users table
-- Reverses migration 003_create_users.sql

drop table if exists "YATDA_Users";

-- Drop the trigger and functions for user creation
drop trigger if exists trg_on_auth_user_created on auth.users;
drop function if exists yatda_handle_new_user();

-- Drop the updated_at trigger functions (may be used elsewhere)
drop trigger if exists trg_yatda_users_updated_at on "YATDA_Users";
drop function if exists yatda_set_updated_at();
