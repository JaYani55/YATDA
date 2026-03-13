import { Hono } from "hono";
import type { PluginEnv } from "./lib/supabase";
import tickets from "./routes/tickets";
import workspaces from "./routes/workspaces";
import categories from "./routes/categories";
import users from "./routes/users";
import googleTasks from "./routes/connectors/google-tasks";

const app = new Hono<{ Bindings: PluginEnv }>();

app.route("/tickets", tickets);
app.route("/categories", categories);
app.route("/workspaces", workspaces);
app.route("/users", users);
app.route("/connectors/google-tasks", googleTasks);

export default app;
