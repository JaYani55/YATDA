-- Migration: Drop Users table
-- Reverses migration 003_create_users.sql

-- Drop the auth.users trigger first — it lives on a table we don't own
-- and must be removed before dropping the function it calls.
drop trigger if exists trg_on_auth_user_created on auth.users;
drop function if exists yatda_handle_new_user();

-- Drop the table; all triggers on YATDA_Users are removed automatically.
drop table if exists "YATDA_Users";

-- Drop the shared updated_at function (may already be gone via CASCADE from 011).
drop function if exists yatda_set_updated_at();
