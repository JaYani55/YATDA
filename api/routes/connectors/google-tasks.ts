import { Hono } from "hono";
import type { PluginEnv } from "../../lib/supabase";
import {
  getSupabaseClient,
  getSupabaseAdminClient,
  getUserIdFromToken,
} from "../../lib/supabase";
import { getPluginConfig, isConfigured } from "../../lib/config";
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

const googleTasks = new Hono<{ Bindings: PluginEnv }>();

// ─── GET /connectors/google-tasks/auth ────────────────────────────────────
googleTasks.get("/auth", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const adminClient = getSupabaseAdminClient(c.env);

  const cfg = await getPluginConfig(adminClient);
  if (!isConfigured(cfg)) {
    return c.json({ error: "Google Tasks is not configured. Add credentials in plugin settings." }, 503);
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", cfg!.google_client_id);
  url.searchParams.set("redirect_uri", cfg!.google_redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", btoa(JSON.stringify({ userId })));

  return c.redirect(url.toString(), 302);
});

// ─── GET /connectors/google-tasks/callback ────────────────────────────────
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

  const adminClient = getSupabaseAdminClient(c.env);

  const cfg = await getPluginConfig(adminClient);
  if (!isConfigured(cfg)) {
    return c.json({ error: "Google Tasks is not configured" }, 503);
  }

  const tokens = await exchangeCodeForTokens(
    code,
    cfg!.google_client_id,
    cfg!.google_client_secret,
    cfg!.google_redirect_uri
  ).catch((e: Error) => {
    throw new Error(`Token exchange: ${e.message}`);
  });

  const encryptedAccess = await encryptToken(tokens.access_token, cfg!.token_encryption_key);
  const encryptedRefresh = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token, cfg!.token_encryption_key)
    : null;

  const { data: connector } = await adminClient
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return c.json({ error: "Google Tasks connector not found in DB" }, 500);

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: upsertError } = await adminClient
    .from("YATDA_Connector_Credentials")
    .upsert(
      {
        user_id: userId,
        connector_id: connector.connector_id,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expiry: tokenExpiry,
        scope: tokens.scope,
      },
      { onConflict: "user_id,connector_id" }
    );

  if (upsertError) return c.json({ error: upsertError.message }, 500);

  return c.redirect("/plugins/yatda/connectors?google_tasks_connected=1", 302);
});

// ─── POST /connectors/google-tasks/sync ───────────────────────────────────
googleTasks.post("/sync", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const adminClient = getSupabaseAdminClient(c.env);

  const cfg = await getPluginConfig(adminClient);
  if (!isConfigured(cfg)) {
    return c.json({ error: "Google Tasks is not configured" }, 503);
  }

  await runSync(userId, c.env, cfg!);
  return c.json({ ok: true, message: "Sync completed" });
});

// ─── GET /connectors/google-tasks/status ──────────────────────────────────
googleTasks.get("/status", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);
  const adminClient = getSupabaseAdminClient(c.env);

  const { data: connector } = await adminClient
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

// ─── DELETE /connectors/google-tasks/disconnect ───────────────────────────
googleTasks.delete("/disconnect", async (c) => {
  const token = c.req.header("Authorization")?.slice(7) ?? "";
  const userId = getUserIdFromToken(token);
  const supabase = getSupabaseClient(c.env, token);
  const adminClient = getSupabaseAdminClient(c.env);

  const { data: connector } = await adminClient
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
export async function runSync(
  userId: string,
  env: PluginEnv,
  cfg: {
    google_client_id: string;
    google_client_secret: string;
    token_encryption_key: string;
  }
): Promise<void> {
  const serviceClient = getSupabaseAdminClient(env);

  const { data: connector } = await serviceClient
    .from("YATDA_Connectors")
    .select("connector_id")
    .eq("connector_slug", GOOGLE_CONNECTOR_SLUG)
    .single();

  if (!connector) return;

  const { data: cred } = await serviceClient
    .from("YATDA_Connector_Credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("connector_id", connector.connector_id)
    .single();

  if (!cred) return;

  let accessToken = await decryptToken(cred.access_token, cfg.token_encryption_key);
  const refreshToken = cred.refresh_token
    ? await decryptToken(cred.refresh_token, cfg.token_encryption_key)
    : null;

  const expiresAt = cred.token_expiry ? new Date(cred.token_expiry).getTime() : 0;
  if (Date.now() > expiresAt - 5 * 60 * 1000 && refreshToken) {
    const refreshed = await refreshAccessToken(
      refreshToken,
      cfg.google_client_id,
      cfg.google_client_secret
    );
    accessToken = refreshed.access_token;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const encryptedNew = await encryptToken(accessToken, cfg.token_encryption_key);
    await serviceClient
      .from("YATDA_Connector_Credentials")
      .update({ access_token: encryptedNew, token_expiry: newExpiry })
      .eq("credential_id", cred.credential_id);
  }

  const { data: workspace } = await serviceClient
    .from("YATDA_Workspaces")
    .select("workspace_id")
    .eq("owner_id", userId)
    .eq("is_personal", true)
    .single();

  if (!workspace) return;

  const taskLists = await listTaskLists(accessToken);

  for (const taskList of taskLists) {
    const gTasks = await listTasks(accessToken, taskList.id);

    for (const gTask of gTasks) {
      const syncHash = computeSyncHash(gTask);

      const { data: existing } = await serviceClient
        .from("YATDA_External_Task_Map")
        .select("*, ticket:YATDA_Tickets(*)")
        .eq("connector_id", connector.connector_id)
        .eq("user_id", userId)
        .eq("external_task_id", gTask.id)
        .single();

      if (existing) {
        if (existing.sync_hash === syncHash) continue;

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

    await updateTask(
      accessToken,
      map.external_list_id ?? "@default",
      map.external_task_id,
      googleTask
    ).catch(() => {
      /* best-effort */
    });
  }
}

export default googleTasks;
