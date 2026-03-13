import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useMemo } from "react";
import type { Ticket, TicketStatus } from "../../lib/api";
import { useUpdateTicket } from "../../hooks/useTickets";
import { useUIStore } from "../../store/uiStore";
import styles from "./KanbanView.module.css";

const COLUMNS: { id: TicketStatus; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "#6366f1" },
  { id: "assigned", label: "Assigned", color: "#f59e0b" },
  { id: "in_progress", label: "In Progress", color: "#ec4899" },
  { id: "review", label: "Review", color: "#8b5cf6" },
  { id: "done", label: "Done", color: "#22c55e" },
];

interface Props {
  tickets: Ticket[];
  workspaceId: string;
}

export default function KanbanView({ tickets, workspaceId }: Props) {
  const { searchQuery } = useUIStore();
  const updateTicket = useUpdateTicket(workspaceId);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ticket_name.toLowerCase().includes(q) ||
        t.ticket_description?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const byStatus = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      backlog: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of filtered) map[t.ticket_status].push(t);
    // Each column sorted by sort_order
    for (const col of Object.values(map)) col.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [filtered]);

  function handleDragStart(e: DragStartEvent) {
    const t = tickets.find((x) => x.ticket_id === e.active.id);
    setActiveTicket(t ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTicket(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const dragged = tickets.find((t) => t.ticket_id === draggedId);
    if (!dragged) return;

    // Check if dropped onto a column header (status id)
    const targetCol = COLUMNS.find((c) => c.id === overId);
    if (targetCol && targetCol.id !== dragged.ticket_status) {
      updateTicket.mutate({ id: draggedId, body: { ticket_status: targetCol.id } });
      return;
    }

    // Reorder within or across columns
    const overTicket = tickets.find((t) => t.ticket_id === overId);
    if (!overTicket) return;

    if (dragged.ticket_status === overTicket.ticket_status) {
      // Same column — reorder
      const col = byStatus[dragged.ticket_status];
      const oldIdx = col.findIndex((t) => t.ticket_id === draggedId);
      const newIdx = col.findIndex((t) => t.ticket_id === overId);
      const reordered = arrayMove(col, oldIdx, newIdx);
      reordered.forEach((t, i) => {
        if (t.sort_order !== i) {
          updateTicket.mutate({ id: t.ticket_id, body: { sort_order: i } });
        }
      });
    } else {
      // Different column — move and place
      updateTicket.mutate({
        id: draggedId,
        body: { ticket_status: overTicket.ticket_status, sort_order: overTicket.sort_order },
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tickets={byStatus[col.id]}
            workspaceId={workspaceId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tickets,
  workspaceId,
}: {
  column: (typeof COLUMNS)[0];
  tickets: Ticket[];
  workspaceId: string;
}) {
  const { openTicket } = useUIStore();

  return (
    <div className={styles.column}>
      <div className={styles.colHeader}>
        <span className={styles.colDot} style={{ background: column.color }} />
        <span className={styles.colLabel}>{column.label}</span>
        <span className={styles.colCount}>{tickets.length}</span>
        <button
          className={styles.colAddBtn}
          onClick={() => openTicket(null)}
          title={`Add task to ${column.label}`}
        >
          +
        </button>
      </div>

      <SortableContext
        items={tickets.map((t) => t.ticket_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.cards}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.ticket_id} ticket={ticket} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function TicketCard({ ticket, overlay = false }: { ticket: Ticket; overlay?: boolean }) {
  const { openTicket } = useUIStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.ticket_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={overlay ? {} : style}
      className={`${styles.card} ${overlay ? styles.overlay : ""}`}
      {...attributes}
      {...listeners}
      onClick={() => openTicket(ticket.ticket_id)}
    >
      {ticket.category && (
        <span
          className={styles.categoryTag}
          style={{ background: ticket.category.category_color + "33", color: ticket.category.category_color }}
        >
          {ticket.category.category_name}
        </span>
      )}

      <p className={styles.cardTitle}>{ticket.ticket_name}</p>

      {ticket.ticket_description && (
        <p className={styles.cardDesc}>{ticket.ticket_description}</p>
      )}

      <div className={styles.cardMeta}>
        {ticket.ticket_points !== null && (
          <span className={styles.points} title="Story points">
            {ticket.ticket_points}pts
          </span>
        )}
        {ticket.ticket_due && (
          <span
            className={styles.due}
            style={{
              color: new Date(ticket.ticket_due) < new Date() ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {new Date(ticket.ticket_due).toLocaleDateString()}
          </span>
        )}
        {!!ticket.assignees?.length && (
          <div className={styles.avatars}>
            {ticket.assignees.slice(0, 3).map((a) => (
              <span key={a.user_id} className={styles.avatar} title={a.user.username}>
                {(a.user.display_name ?? a.user.username).charAt(0).toUpperCase()}
              </span>
            ))}
            {ticket.assignees.length > 3 && (
              <span className={styles.avatar}>+{ticket.assignees.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
