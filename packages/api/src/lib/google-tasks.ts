/**
 * Google Tasks API helpers — uses raw fetch() (googleapis is Node-only).
 * All calls are made from the Cloudflare Worker context.
 */

const GOOGLE_OAUTH_BASE = "https://oauth2.googleapis.com";
const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;      // RFC 3339 timestamp
  completed?: string;
  updated: string;
  selfLink: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return res.json<GoogleTokenResponse>();
}

/** Refresh an access token using the stored refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return res.json<GoogleTokenResponse>();
}

/** List all task lists for the authenticated user. */
export async function listTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const res = await fetch(`${TASKS_API_BASE}/users/@me/lists?maxResults=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`listTaskLists: ${res.status}`);
  const body = await res.json<{ items?: GoogleTaskList[] }>();
  return body.items ?? [];
}

/** List all tasks in a given task list. */
export async function listTasks(accessToken: string, taskListId: string): Promise<GoogleTask[]> {
  const tasks: GoogleTask[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${TASKS_API_BASE}/lists/${taskListId}/tasks`);
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("showCompleted", "true");
    url.searchParams.set("showHidden", "false");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`listTasks: ${res.status}`);
    const body = await res.json<{ items?: GoogleTask[]; nextPageToken?: string }>();

    tasks.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return tasks;
}

/** Create a task in a task list. Returns the created task. */
export async function createTask(
  accessToken: string,
  taskListId: string,
  task: Partial<GoogleTask>
): Promise<GoogleTask> {
  const res = await fetch(`${TASKS_API_BASE}/lists/${taskListId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`createTask: ${res.status}`);
  return res.json<GoogleTask>();
}

/** Update an existing task. */
export async function updateTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  task: Partial<GoogleTask>
): Promise<GoogleTask> {
  const res = await fetch(`${TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`updateTask: ${res.status}`);
  return res.json<GoogleTask>();
}

/** Compute a SHA-256 hex digest of the sync-relevant task fields for change detection. */
export async function computeSyncHash(task: GoogleTask): Promise<string> {
  const key = `${task.title}|${task.notes ?? ""}|${task.status}|${task.due ?? ""}`;
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Map a Google Task status to a YATDA ticket status. */
export function mapGoogleStatusToYatda(
  status: GoogleTask["status"]
): "backlog" | "done" {
  return status === "completed" ? "done" : "backlog";
}

/** Map a YATDA ticket status to a Google Task status. */
export function mapYatdaStatusToGoogle(
  status: string
): GoogleTask["status"] {
  return status === "done" ? "completed" : "needsAction";
}
