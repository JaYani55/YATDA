import { Hono } from "hono";
import type { Env } from "../types";
import { getUserSupabaseClient } from "../lib/supabase";

const workspaces = new Hono<{ Bindings: Env }>();

// GET /api/workspaces — list workspaces the current user is a member of
workspaces.get("/", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

  const { data, error } = await supabase
    .from("YATDA_Workspaces")
    .select(`
      *,
      member_count:YATDA_Workspace_Members(count)
    `)
    .order("created_at");

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/workspaces
workspaces.post("/", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

  const body = await c.req.json<{
    name: string;
    description?: string;
    icon?: string;
  }>();

  if (!body.name) return c.json({ error: "name is required" }, 400);

  const { data, error } = await supabase
    .from("YATDA_Workspaces")
    .insert({
      name: body.name,
      description: body.description,
      icon: body.icon,
      owner_id: userId,
      is_personal: false,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// GET /api/workspaces/:id/members
workspaces.get("/:id/members", async (c) => {
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const { data, error } = await supabase
    .from("YATDA_Workspace_Members")
    .select(`
      role,
      joined_at,
      user:YATDA_Users(user_id, username, display_name, avatar_url)
    `)
    .eq("workspace_id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/workspaces/:id/members — add a member (admin only, enforced by RLS)
workspaces.post("/:id/members", async (c) => {
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const body = await c.req.json<{ user_id: string; role?: string }>();
  if (!body.user_id) return c.json({ error: "user_id is required" }, 400);

  const { data, error } = await supabase
    .from("YATDA_Workspace_Members")
    .insert({
      workspace_id: id,
      user_id: body.user_id,
      role: body.role ?? "member",
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// DELETE /api/workspaces/:id/members/:userId
workspaces.delete("/:id/members/:userId", async (c) => {
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);
  const { id, userId: targetUserId } = c.req.param();

  const { error } = await supabase
    .from("YATDA_Workspace_Members")
    .delete()
    .eq("workspace_id", id)
    .eq("user_id", targetUserId);

  if (error) return c.json({ error: error.message }, 500);
  return c.body(null, 204);
});

export default workspaces;
