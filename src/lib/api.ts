// Supabase client is provided by the CMS at @/lib/supabase
import { supabase } from "@/lib/supabase";

// Routed under /api/plugins/yatda by the CMS
const API_BASE = "/api/plugins/yatda";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await (res.json() as Promise<{ error?: string }>).catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Tickets ───────────────────────────────────────────────────────────────
export const ticketsApi = {
  list: (params: { workspace_id: string; status?: string; category_id?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<Ticket[]>(`/tickets?${qs}`);
  },
  get: (id: string) => request<Ticket>(`/tickets/${id}`),
  create: (body: CreateTicketBody) =>
    request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<CreateTicketBody & { sort_order: number }>) =>
    request<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/tickets/${id}`, { method: "DELETE" }),
};

// ─── Categories ────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: (workspace_id: string) =>
    request<Category[]>(`/categories?workspace_id=${workspace_id}`),
  create: (body: CreateCategoryBody) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<CreateCategoryBody>) =>
    request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/categories/${id}`, { method: "DELETE" }),
};

// ─── Workspaces ────────────────────────────────────────────────────────────
export const workspacesApi = {
  list: () => request<Workspace[]>("/workspaces"),
  create: (body: { name: string; description?: string }) =>
    request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify(body) }),
  getMembers: (id: string) => request<WorkspaceMember[]>(`/workspaces/${id}/members`),
  addMember: (id: string, user_id: string, role?: string) =>
    request<WorkspaceMember>(`/workspaces/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id, role }),
    }),
  removeMember: (id: string, userId: string) =>
    request<void>(`/workspaces/${id}/members/${userId}`, { method: "DELETE" }),
};

// ─── Users ─────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => request<YatdaUser>("/users/me"),
  updateMe: (body: Partial<YatdaUser>) =>
    request<YatdaUser>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Google Tasks connector ────────────────────────────────────────────────
export const googleTasksApi = {
  status: () => request<{ connected: boolean }>("/connectors/google-tasks/status"),
  connect: () => {
    window.location.href = `${API_BASE}/connectors/google-tasks/auth`;
  },
  sync: () => request<{ ok: boolean }>("/connectors/google-tasks/sync", { method: "POST" }),
  disconnect: () => request<void>("/connectors/google-tasks/disconnect", { method: "DELETE" }),
};

// ─── Types ─────────────────────────────────────────────────────────────────
export type TicketStatus = "backlog" | "assigned" | "in_progress" | "review" | "done";

export interface Ticket {
  ticket_id: string;
  workspace_id: string;
  category_id: string | null;
  ticket_name: string;
  ticket_description: string | null;
  ticket_status: TicketStatus;
  ticket_points: number | null;
  ticket_date: string | null;
  ticket_due: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  phase_backlog_at: string | null;
  phase_assigned_at: string | null;
  phase_in_progress_at: string | null;
  phase_review_at: string | null;
  phase_done_at: string | null;
  assignees?: { user_id: string; user: YatdaUser }[];
  category?: Category | null;
}

export interface Category {
  category_id: string;
  workspace_id: string;
  category_name: string;
  category_color: string;
  category_description: string | null;
}

export interface Workspace {
  workspace_id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_personal: boolean;
  icon: string | null;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: YatdaUser;
}

export interface YatdaUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  points: number;
}

export interface CreateTicketBody {
  workspace_id: string;
  ticket_name: string;
  ticket_description?: string;
  ticket_status?: TicketStatus;
  ticket_points?: number;
  ticket_date?: string;
  ticket_due?: string;
  category_id?: string;
  assignee_ids?: string[];
}

export interface CreateCategoryBody {
  workspace_id: string;
  category_name: string;
  category_color?: string;
  category_description?: string;
  user_ids?: string[];
}
