-- Migration: Drop PostgreSQL extensions (optional)
-- Reverses migration 001_create_extensions.sql

-- Note: Extensions are typically left installed for future use.
-- Uncomment below if you want to completely remove them.

-- drop extension if exists "pgcrypto";
-- drop extension if exists "uuid-ossp";
