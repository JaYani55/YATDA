import { Hono } from "hono";
import type { Env } from "../types";
import { getUserSupabaseClient } from "../lib/supabase";

const users = new Hono<{ Bindings: Env }>();

// GET /api/users/me
users.get("/me", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

  const { data, error } = await supabase
    .from("YATDA_Users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// PATCH /api/users/me
users.patch("/me", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

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
