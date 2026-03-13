import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";
import { authMiddleware } from "./middleware/auth";
import tickets from "./routes/tickets";
import categories from "./routes/categories";
import workspaces from "./routes/workspaces";
import users from "./routes/users";
import googleTasks, { runSync } from "./routes/connectors/google-tasks";

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ─────────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      // Allow any localhost port in dev; lock down in production
      if (origin?.startsWith("http://localhost")) return origin;
      // Add your production domain here
      // if (origin === "https://yatda.app") return origin;
      return null;
    },
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 600,
  })
);

// ─── Health check (unauthenticated) ───────────────────────────────────────
app.get("/api/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Authenticated routes ─────────────────────────────────────────────────
app.use("/api/*", authMiddleware);

app.route("/api/tickets", tickets);
app.route("/api/categories", categories);
app.route("/api/workspaces", workspaces);
app.route("/api/users", users);
app.route("/api/connectors/google-tasks", googleTasks);

// ─── Cloudflare Cron Trigger (every 15 minutes) ───────────────────────────
// Syncs all users who have connected Google Tasks.
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const serviceClient = (await import("./lib/supabase")).getServiceSupabaseClient(env);

    // Retrieve all users who have Google Tasks credentials
    const { data: connectors } = await serviceClient
      .from("YATDA_Connectors")
      .select("connector_id")
      .eq("connector_slug", "google-tasks")
      .single();

    if (!connectors) return;

    const { data: creds } = await serviceClient
      .from("YATDA_Connector_Credentials")
      .select("user_id")
      .eq("connector_id", connectors.connector_id);

    if (!creds?.length) return;

    // Run syncs sequentially to avoid rate limit spikes
    for (const cred of creds) {
      await runSync(cred.user_id, env).catch(console.error);
    }
  },
};
