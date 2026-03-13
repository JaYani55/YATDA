-- Migration: Enable required PostgreSQL extensions
-- These extensions are available in Supabase by default.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
