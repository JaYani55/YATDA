-- Migration: Drop Comments table
-- Reverses migration 011_create_comments.sql

drop table if exists "YATDA_Comments";

-- Drop the trigger function if no longer needed elsewhere
drop function if exists yatda_set_updated_at();
