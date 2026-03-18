import { Hono } from "hono";
import type { PluginEnv } from "../lib/supabase";
import { getSupabaseClient, getSupabaseAdminClient, getUserIdFromToken } from "../lib/supabase";

const users = new Hono<{ Bindings: PluginEnv }>();

// GET /users/me
users.get("/me", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);

  const { data, error } = await supabase
    .from("YATDA_Users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// POST /users/me/ensure — create YATDA_Users row if missing (for existing CMS users)
// This endpoint is idempotent; it creates the user profile and personal workspace on first call
// subsequent calls are no-ops (upsert ignores duplicates)
users.post("/me/ensure", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);

  if (!userId) {
    return c.json({ error: "Unable to extract user ID from token" }, 401);
  }

  // Use admin client to bypass RLS during user creation
  const adminClient = await getSupabaseAdminClient(c.env);

  // Get the user's auth details
  const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);

  if (userError || !user) {
    return c.json({ error: "User not found in auth system" }, 404);
  }

  // Create YATDA_Users entry if it doesn't exist
  const { error: upsertError } = await adminClient
    .from("YATDA_Users")
    .upsert(
      {
        user_id: userId,
        username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? userId.slice(0, 8),
        display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  if (upsertError) {
    return c.json({ error: upsertError.message }, 500);
  }

  // Trigger chain will auto-create personal workspace and membership
  // (trg_yatda_personal_workspace → trg_yatda_workspace_owner_member)
  return c.json({ ok: true }, 200);
});

// PATCH /users/me
users.patch("/me", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);

  const body = await c.req.json<{
    username?: string;
    display_name?: string;
    avatar_url?: string;
  }>();

  const { data, error } = await supabase
    .from("YATDA_Users")
    .update(body)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

export default users;
