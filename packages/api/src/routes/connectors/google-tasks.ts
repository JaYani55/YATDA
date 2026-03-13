import { Hono } from "hono";
import type { Env } from "../../types";
import { getUserSupabaseClient, getServiceSupabaseClient } from "../../lib/supabase";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  listTaskLists,
  listTasks,
  createTask,
  updateTask,
  computeSyncHash,
  mapGoogleStatusToYatda,
  mapYatdaStatusToGoogle,
} from "../../lib/google-tasks";
import { encryptToken, decryptToken } from "../../lib/crypto";

const GOOGLE_CONNECTOR_SLUG = "google-tasks";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "openid",
  "email",
].join(" ");

const googleTasks = new Hono<{ Bindings: Env }>();

// ─── Local-test stubs ─────────────────────────────────────────────────────
// In LOCAL_TEST mode there are no real Google credentials, so all connector
// routes return safe stubs instead of attempting OAuth flows.
googleTasks.use("*", async (c, next) => {
  if (c.env.LOCAL_TEST !== "true") {
    await next();
    return;
  }
  // Allow the status endpoint to return "not connected" gracefully.
  const path = new URL(c.req.url).pathname;
  if (path.endsWith("/status")) {
    return c.json({ connected: false });
  }
  return c.json(
    { error: "Google Tasks connector is not available in localtest mode" },
    503,
  );
});

// ─── GET /api/connectors/google-tasks/auth ────────────────────────────────
// Generates the Google OAuth2 authorization URL and redirects the user.
googleTasks.get("/auth", async (c) => {
  const userId = c.get("userId");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", c.env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  // Embed userId in state so we can associate the callback with the right user
  url.searchParams.set("state", btoa(JSON.stringify({ userId })));

  return c.redirect(url.toString(), 302);
});

// ─── GET /api/connectors/google-tasks/callback ───────────────────────────
// OAuth2 callback — exchanges code for tokens and stores them encrypted.
googleTasks.get("/callback", async (c) => {
  const { code, state, error: oauthError } = c.req.query();

  if (oauthError) {
    return c.json({ error: `Google OAuth error: ${oauthError}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: "Missing code or state parameter" }, 400);
  }

  let userId: string;
  try {
    const parsed = JSON.parse(atob(state));
    userId = parsed.userId;
    if (!userId) throw new Error("no userId");
  } catch {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(
    code,
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI
  ).catch((e) => {
    throw new Error(`Token exchange: ${e.message}`);
  });

  // Encrypt tokens before storing
  const encryptedAccess = await encryptToken(tokens.access_token, c.env.TOKEN_ENCRYPTION_KEY);
  const encryptedRefresh = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token, c.env.TOKEN_ENCRYPTION_KEY)
    : null;

  const serviceClient = getServiceSupabaseClient(c.env);

  // Resolve connector_id from slug
  const { data: connector } = await serviceClient
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return c.json({ error: "Google Tasks connector not found" }, 500);

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const credentialRow = {
    user_id: userId,
    connector_id: connector.connector_id,
    access_token: encryptedAccess,
    refresh_token: encryptedRefresh,
    token_expiry: tokenExpiry,
    scope: tokens.scope,
  };

  const { error: upsertError } = await serviceClient
    .from("YATDA_Connector_Credentials")
    .upsert(credentialRow, { onConflict: "user_id,connector_id" });

  if (upsertError) return c.json({ error: upsertError.message }, 500);

  // Redirect the SPA to a success page (update URL to match your deployment)
  return c.redirect("/?google_tasks_connected=1", 302);
});

// ─── POST /api/connectors/google-tasks/sync ───────────────────────────────
// Manual sync trigger for the authenticated user.
googleTasks.post("/sync", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  await runSync(userId, c.env, token);
  return c.json({ ok: true, message: "Sync completed" });
});

// ─── GET /api/connectors/google-tasks/status ─────────────────────────────
// Returns connection status for the current user.
googleTasks.get("/status", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

  const { data: connector } = await getServiceSupabaseClient(c.env)
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return c.json({ connected: false });

  const { data: cred } = await supabase
    .from("YATDA_Connector_Credentials")
    .select("credential_id, token_expiry, scope, updated_at")
    .eq("user_id", userId)
    .eq("connector_id", connector.connector_id)
    .single();

  return c.json({ connected: !!cred, credential: cred ?? null });
});

// ─── DELETE /api/connectors/google-tasks/disconnect ──────────────────────
googleTasks.delete("/disconnect", async (c) => {
  const userId = c.get("userId");
  const token = c.req.header("Authorization")!.slice(7);
  const supabase = getUserSupabaseClient(c.env, token);

  const { data: connector } = await getServiceSupabaseClient(c.env)
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return c.json({ error: "Connector not found" }, 404);

  await supabase
    .from("YATDA_Connector_Credentials")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connector.connector_id);

  return c.body(null, 204);
});

// ─── Sync Logic ────────────────────────────────────────────────────────────
/**
 * Full bidirectional sync for a single user.
 * 1. Fetch credentials, decrypt tokens, refresh if near expiry.
 * 2. Pull all Google Task lists.
 * 3. For each list, pull tasks and upsert into YATDA_Tickets.
 * 4. For YATDA tickets with outbound sync, push changes to Google Tasks.
 */
export async function runSync(
  userId: string,
  env: Env,
  _userJwt?: string
): Promise<void> {
  const serviceClient = getServiceSupabaseClient(env);

  // Load connector
  const { data: connector } = await serviceClient
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return;

  // Load credentials
  const { data: cred } = await serviceClient
    .from("YATDA_Connector_Credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("connector_id", connector.connector_id)
    .single();

  if (!cred) return; // User hasn't connected Google Tasks

  // Decrypt tokens
  let accessToken = await decryptToken(cred.access_token, env.TOKEN_ENCRYPTION_KEY);
  const refreshToken = cred.refresh_token
    ? await decryptToken(cred.refresh_token, env.TOKEN_ENCRYPTION_KEY)
    : null;

  // Refresh token if expired or within 5 minutes of expiry
  const expiresAt = cred.token_expiry ? new Date(cred.token_expiry).getTime() : 0;
  if (Date.now() > expiresAt - 5 * 60 * 1000 && refreshToken) {
    const refreshed = await refreshAccessToken(
      refreshToken,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    );
    accessToken = refreshed.access_token;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const encryptedNew = await encryptToken(accessToken, env.TOKEN_ENCRYPTION_KEY);
    await serviceClient
      .from("YATDA_Connector_Credentials")
      .update({ access_token: encryptedNew, token_expiry: newExpiry })
      .eq("credential_id", cred.credential_id);
  }

  // Get the user's personal workspace (default sync target)
  const { data: workspace } = await serviceClient
    .from("YATDA_Workspaces")
    .select("workspace_id")
    .eq("owner_id", userId)
    .eq("is_personal", true)
    .single();

  if (!workspace) return;

  // Load all task lists from Google
  const taskLists = await listTaskLists(accessToken);

  for (const taskList of taskLists) {
    const googleTasks = await listTasks(accessToken, taskList.id);

    for (const gTask of googleTasks) {
      const syncHash = computeSyncHash(gTask);

      // Check if we already have a mapping
      const { data: existing } = await serviceClient
        .from("YATDA_External_Task_Map")
        .select("*, ticket:YATDA_Tickets(*)")
        .eq("connector_id", connector.connector_id)
        .eq("user_id", userId)
        .eq("external_task_id", gTask.id)
        .single();

      if (existing) {
        // Skip if nothing changed
        if (existing.sync_hash === syncHash) continue;

        // Update YATDA ticket from Google
        await serviceClient
          .from("YATDA_Tickets")
          .update({
            ticket_name: gTask.title,
            ticket_description: gTask.notes,
            ticket_status: mapGoogleStatusToYatda(gTask.status),
            ticket_due: gTask.due ?? null,
          })
          .eq("ticket_id", existing.ticket_id);

        await serviceClient
          .from("YATDA_External_Task_Map")
          .update({ sync_hash: syncHash, last_synced_at: new Date().toISOString() })
          .eq("map_id", existing.map_id);
      } else {
        // Create a new YATDA ticket
        const { data: newTicket } = await serviceClient
          .from("YATDA_Tickets")
          .insert({
            workspace_id: workspace.workspace_id,
            ticket_name: gTask.title,
            ticket_description: gTask.notes,
            ticket_status: mapGoogleStatusToYatda(gTask.status),
            ticket_due: gTask.due ?? null,
            created_by: userId,
          })
          .select()
          .single();

        if (newTicket) {
          await serviceClient.from("YATDA_External_Task_Map").insert({
            ticket_id: newTicket.ticket_id,
            connector_id: connector.connector_id,
            user_id: userId,
            external_task_id: gTask.id,
            external_list_id: taskList.id,
            sync_hash: syncHash,
            last_synced_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Outbound: push YATDA tickets back to Google Tasks if they were changed locally
  const { data: maps } = await serviceClient
    .from("YATDA_External_Task_Map")
    .select("*, ticket:YATDA_Tickets(*)")
    .eq("connector_id", connector.connector_id)
    .eq("user_id", userId)
    .in("sync_direction", ["outbound", "bidirectional"]);

  for (const map of maps ?? []) {
    const ticket = map.ticket;
    if (!ticket) continue;

    const googleTask = {
      title: ticket.ticket_name,
      notes: ticket.ticket_description ?? undefined,
      status: mapYatdaStatusToGoogle(ticket.ticket_status),
      due: ticket.ticket_due ?? undefined,
    };

    await updateTask(accessToken, map.external_list_id ?? "@default", map.external_task_id, googleTask).catch(
      () => { /* best-effort, log in production */ }
    );
  }
}

export default googleTasks;
