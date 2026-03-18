-- Migration: Revert backfill of existing CMS users
-- This is a no-op reversal; the YATDA_Users rows and workspaces created
-- by the migration and triggers are intentional and should not be deleted.
-- If you need to fully remove YATDA data, use the main table drop migrations.

-- This migration intentionally does nothing on rollback.
