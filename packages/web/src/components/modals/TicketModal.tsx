import { useState, useEffect } from "react";
import { useUIStore } from "../../store/uiStore";
import { useTicket, useCreateTicket, useUpdateTicket, useDeleteTicket } from "../../hooks/useTickets";
import { useCategories } from "../../hooks/useCategories";
import { useWorkspaceMembers } from "../../hooks/useWorkspaces";
import type { TicketStatus, CreateTicketBody } from "../../lib/api";
import styles from "./TicketModal.module.css";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export default function TicketModal() {
  const { selectedTicketId, activeWorkspaceId, closeTicketModal } = useUIStore();
  const isEditing = !!selectedTicketId;

  const { data: existing } = useTicket(selectedTicketId);
  const { data: categories = [] } = useCategories(activeWorkspaceId);
  const { data: members = [] } = useWorkspaceMembers(activeWorkspaceId);
  const createTicket = useCreateTicket(activeWorkspaceId!);
  const updateTicket = useUpdateTicket(activeWorkspaceId!);
  const deleteTicket = useDeleteTicket(activeWorkspaceId!);

  const [form, setForm] = useState<{
    ticket_name: string;
    ticket_description: string;
    ticket_status: TicketStatus;
    ticket_points: string;
    ticket_date: string;
    ticket_due: string;
    category_id: string;
    assignee_ids: string[];
  }>({
    ticket_name: "",
    ticket_description: "",
    ticket_status: "backlog",
    ticket_points: "",
    ticket_date: "",
    ticket_due: "",
    category_id: "",
    assignee_ids: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (existing) {
      setForm({
        ticket_name: existing.ticket_name,
        ticket_description: existing.ticket_description ?? "",
        ticket_status: existing.ticket_status,
        ticket_points: existing.ticket_points?.toString() ?? "",
        ticket_date: existing.ticket_date ?? "",
        ticket_due: existing.ticket_due ? existing.ticket_due.slice(0, 10) : "",
        category_id: existing.category_id ?? "",
        assignee_ids: existing.assignees?.map((a) => a.user_id) ?? [],
      });
    }
  }, [existing]);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAssignee(uid: string) {
    setForm((f) => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(uid)
        ? f.assignee_ids.filter((id) => id !== uid)
        : [...f.assignee_ids, uid],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ticket_name.trim()) { setError("Title is required"); return; }
    setError(null);
    setSaving(true);

    const body: CreateTicketBody = {
      workspace_id: activeWorkspaceId!,
      ticket_name: form.ticket_name.trim(),
      ticket_description: form.ticket_description || undefined,
      ticket_status: form.ticket_status,
      ticket_points: form.ticket_points ? parseInt(form.ticket_points, 10) : undefined,
      ticket_date: form.ticket_date || undefined,
      ticket_due: form.ticket_due ? new Date(form.ticket_due).toISOString() : undefined,
      category_id: form.category_id || undefined,
      assignee_ids: form.assignee_ids,
    };

    try {
      if (isEditing) {
        await updateTicket.mutateAsync({ id: selectedTicketId!, body });
      } else {
        await createTicket.mutateAsync(body);
      }
      closeTicketModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ticket");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTicketId) return;
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    await deleteTicket.mutateAsync(selectedTicketId);
    closeTicketModal();
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeTicketModal()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Ticket">
        <div className={styles.header}>
          <h2 className={styles.title}>{isEditing ? "Edit Ticket" : "New Ticket"}</h2>
          <button className={styles.closeBtn} onClick={closeTicketModal} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input
              type="text"
              className={styles.input}
              value={form.ticket_name}
              onChange={(e) => set("ticket_name", e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={form.ticket_description}
              onChange={(e) => set("ticket_description", e.target.value)}
              rows={4}
              placeholder="Add more details…"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select className={styles.input} value={form.ticket_status} onChange={(e) => set("ticket_status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Points</label>
              <input
                type="number"
                className={styles.input}
                value={form.ticket_points}
                onChange={(e) => set("ticket_points", e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.ticket_date}
                onChange={(e) => set("ticket_date", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Due Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.ticket_due}
                onChange={(e) => set("ticket_due", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select className={styles.input} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>

          {members.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Assignees</label>
              <div className={styles.assigneeGrid}>
                {members.map(({ user }) => {
                  if (!user) return null;
                  const selected = form.assignee_ids.includes(user.user_id);
                  return (
                    <button
                      key={user.user_id}
                      type="button"
                      className={`${styles.assigneeChip} ${selected ? styles.selected : ""}`}
                      onClick={() => toggleAssignee(user.user_id)}
                    >
                      <span className={styles.assigneeAvatar}>
                        {(user.display_name ?? user.username).charAt(0).toUpperCase()}
                      </span>
                      {user.display_name ?? user.username}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            {isEditing && (
              <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className={styles.cancelBtn} onClick={closeTicketModal}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
