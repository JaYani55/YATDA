-- Migration: Drop External Task Map table
-- Reverses migration 013_create_external_task_map.sql

drop table if exists "YATDA_External_Task_Map";
