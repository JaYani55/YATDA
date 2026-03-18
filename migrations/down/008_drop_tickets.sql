-- Migration: Drop Tickets table and ticket_status enum
-- Reverses migration 008_create_tickets.sql

drop table if exists "YATDA_Tickets";
drop type if exists ticket_status;
