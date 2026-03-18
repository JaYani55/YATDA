-- Migration: Backfill existing CMS users into YATDA
-- This migration ensures that users who existed before YATDA was installed
-- are provisioned with YATDA_Users rows and personal workspaces.
-- The trigger chain will auto-create personal workspace and membership.

INSERT INTO "YATDA_Users" (user_id, username, display_name, avatar_url)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1),
    'user_' || (u.id::text)::varchar
  ),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    NULL
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM "YATDA_Users" yu
  WHERE yu.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Note: The DB triggers (trg_yatda_personal_workspace, trg_yatda_workspace_owner_member)
-- are SECURITY DEFINER and will auto-create personal workspaces and memberships
-- for the newly inserted users. This migration is idempotent and safe to re-run.
