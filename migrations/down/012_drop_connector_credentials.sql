-- Migration: Drop Connector Credentials table
-- Reverses migration 012_create_connector_credentials.sql

drop table if exists "YATDA_Connector_Credentials";
