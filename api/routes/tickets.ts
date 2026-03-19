import { Hono } from "hono";
import type { PluginEnv } from "../lib/supabase";
import { getSupabaseClient, getUserIdFromToken } from "../lib/supabase";

const tickets = new Hono<{ Bindings: PluginEnv }>();

// GET /tickets?workspace_id=...&status=...&category_id=...
tickets.get("/", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { workspace_id, status, category_id } = c.req.query();

  if (!workspace_id) {
    return c.json({ error: "workspace_id query param is required" }, 400);
  }

  let query = supabase
    .from("YATDA_Tickets")
    .select(`
      *,
      assignees:YATDA_Ticket_Assignees(
        user_id,
        assigned_at,
        user:YATDA_Users!fk_ticket_assignees_assignee(user_id, username, display_name, avatar_url)
      ),
      category:YATDA_Categories(category_id, category_name, category_color)
    `)
    .eq("workspace_id", workspace_id)
    .order("sort_order", { ascending: true });

  if (status && status !== "undefined") query = query.eq("ticket_status", status);
  if (category_id && category_id !== "undefined") query = query.eq("category_id", category_id);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// GET /tickets/:id
tickets.get("/:id", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const { data, error } = await supabase
    .from("YATDA_Tickets")
    .select(`
      *,
      assignees:YATDA_Ticket_Assignees(
        user_id,
        assigned_at,
        user:YATDA_Users!fk_ticket_assignees_assignee(user_id, username, display_name, avatar_url)
      ),
      category:YATDA_Categories(category_id, category_name, category_color),
      comments:YATDA_Comments(
        comment_id, content, created_at, edited_at, parent_id,
        author:YATDA_Users(user_id, username, display_name, avatar_url)
      )
    `)
    .eq("ticket_id", id)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// POST /tickets
tickets.post("/", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);

  const body = await c.req.json<{
    workspace_id: string;
    ticket_name: string;
    ticket_description?: string;
    ticket_status?: string;
    ticket_points?: number;
    ticket_date?: string;
    ticket_due?: string;
    category_id?: string;
    assignee_ids?: string[];
  }>();

  if (!body.workspace_id || !body.ticket_name) {
    return c.json({ error: "workspace_id and ticket_name are required" }, 400);
  }

  const { data: ticket, error } = await supabase
    .from("YATDA_Tickets")
    .insert({
      workspace_id: body.workspace_id,
      ticket_name: body.ticket_name,
      ticket_description: body.ticket_description,
      ticket_status: body.ticket_status ?? "backlog",
      ticket_points: body.ticket_points,
      ticket_date: body.ticket_date,
      ticket_due: body.ticket_due,
      category_id: body.category_id,
      created_by: userId,
    })
    .select(`
      *,
      assignees:YATDA_Ticket_Assignees(
        user_id,
        assigned_at,
        user:YATDA_Users!fk_ticket_assignees_assignee(user_id, username, display_name, avatar_url)
      ),
      category:YATDA_Categories(category_id, category_name, category_color)
    `)
    .single();

  if (error) return c.json({ error: error.message }, 500);

  if (body.assignee_ids?.length) {
    const assigneeRows = body.assignee_ids.map((uid) => ({
      ticket_id: ticket.ticket_id,
      user_id: uid,
      assigned_by: userId,
    }));
    const { error: assignErr } = await supabase
      .from("YATDA_Ticket_Assignees")
      .insert(assigneeRows);
    if (assignErr) return c.json({ error: assignErr.message }, 500);
  }

  return c.json(ticket, 201);
});

// PATCH /tickets/:id
tickets.patch("/:id", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const body = await c.req.json<{
    ticket_name?: string;
    ticket_description?: string;
    ticket_status?: string;
    ticket_points?: number;
    ticket_date?: string;
    ticket_due?: string;
    category_id?: string;
    sort_order?: number;
    assignee_ids?: string[];
  }>();

  const { assignee_ids, ...ticketFields } = body;

  if (Object.keys(ticketFields).length > 0) {
    const { error } = await supabase
      .from("YATDA_Tickets")
      .update(ticketFields)
      .eq("ticket_id", id);
    if (error) return c.json({ error: error.message }, 500);
  }

  if (assignee_ids !== undefined) {
    await supabase.from("YATDA_Ticket_Assignees").delete().eq("ticket_id", id);
    if (assignee_ids.length > 0) {
      const rows = assignee_ids.map((uid) => ({
        ticket_id: id,
        user_id: uid,
        assigned_by: userId,
      }));
      const { error: assignErr } = await supabase
        .from("YATDA_Ticket_Assignees")
        .insert(rows);
      if (assignErr) return c.json({ error: assignErr.message }, 500);
    }
  }

  const { data, error } = await supabase
    .from("YATDA_Tickets")
    .select(`
      *,
      assignees:YATDA_Ticket_Assignees(
        user_id,
        assigned_at,
        user:YATDA_Users!fk_ticket_assignees_assignee(user_id, username, display_name, avatar_url)
      ),
      category:YATDA_Categories(category_id, category_name, category_color)
    `)
    .eq("ticket_id", id)
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// DELETE /tickets/:id
tickets.delete("/:id", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const supabase = getSupabaseClient(c.env, token);
  const { id } = c.req.param();

  const { error } = await supabase
    .from("YATDA_Tickets")
    .delete()
    .eq("ticket_id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.body(null, 204);
});

export default tickets;
