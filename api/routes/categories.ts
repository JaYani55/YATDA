import { Hono } from "hono";
import type { PluginEnv } from "../lib/supabase";
import { getSupabaseClient } from "../lib/supabase";

const categories = new Hono<{ Bindings: PluginEnv }>();

// GET /categories?workspace_id=...
categories.get("/", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { workspace_id } = c.req.query();

  if (!workspace_id) return c.json({ error: "workspace_id is required" }, 400);

  const { data, error } = await supabase
    .from("YATDA_Categories")
    .select(`
      *,
      assigned_users:YATDA_Category_Users(
        user_id,
        user:YATDA_Users(user_id, username, display_name, avatar_url)
      )
    `)
    .eq("workspace_id", workspace_id)
    .order("category_name");

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /categories
categories.post("/", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);

  const body = await c.req.json<{
    workspace_id: string;
    category_name: string;
    category_color?: string;
    category_description?: string;
    user_ids?: string[];
  }>();

  if (!body.workspace_id || !body.category_name) {
    return c.json({ error: "workspace_id and category_name are required" }, 400);
  }

  const { data: cat, error } = await supabase
    .from("YATDA_Categories")
    .insert({
      workspace_id: body.workspace_id,
      category_name: body.category_name,
      category_color: body.category_color ?? "#6366f1",
      category_description: body.category_description,
    })
    .select(`
      *,
      assigned_users:YATDA_Category_Users(
        user_id,
        user:YATDA_Users(user_id, username, display_name, avatar_url)
      )
    `)
    .single();

  if (error) return c.json({ error: error.message }, 500);

  if (body.user_ids?.length) {
    const rows = body.user_ids.map((uid) => ({
      category_id: cat.category_id,
      user_id: uid,
    }));
    await supabase.from("YATDA_Category_Users").insert(rows);
  }

  return c.json(cat, 201);
});

// PATCH /categories/:id
categories.patch("/:id", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const body = await c.req.json<{
    category_name?: string;
    category_color?: string;
    category_description?: string;
    user_ids?: string[];
  }>();

  const { user_ids, ...fields } = body;

  if (Object.keys(fields).length > 0) {
    const { error } = await supabase
      .from("YATDA_Categories")
      .update(fields)
      .eq("category_id", id);
    if (error) return c.json({ error: error.message }, 500);
  }

  if (user_ids !== undefined) {
    await supabase.from("YATDA_Category_Users").delete().eq("category_id", id);
    if (user_ids.length > 0) {
      const rows = user_ids.map((uid) => ({ category_id: id, user_id: uid }));
      await supabase.from("YATDA_Category_Users").insert(rows);
    }
  }

  const { data, error } = await supabase
    .from("YATDA_Categories")
    .select(`
      *,
      assigned_users:YATDA_Category_Users(
        user_id,
        user:YATDA_Users(user_id, username, display_name, avatar_url)
      )
    `)
    .eq("category_id", id)
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// DELETE /categories/:id
categories.delete("/:id", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const { error } = await supabase
    .from("YATDA_Categories")
    .delete()
    .eq("category_id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.body(null, 204);
});

export default categories;
