-- Migration: Drop Ticket Assignees table
-- Reverses migration 009_create_ticket_assignees.sql

drop table if exists "YATDA_Ticket_Assignees";
