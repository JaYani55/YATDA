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
  const [pendingStatusChange, setPendingStatusChange] = useState<Record<string, TicketStatus>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ticket_name.toLowerCase().includes(q) ||
        (t.ticket_description ?? "").toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  // Build column map: status → sorted tickets
  const columnMap = useMemo(() => {
    const map = new Map<TicketStatus, Ticket[]>();
    for (const col of COLUMNS) map.set(col.id, []);
    for (const t of filtered) {
      const col = map.get(t.ticket_status);
      if (col) col.push(t);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [filtered]);

  function handleDragStart(event: DragStartEvent) {
    const ticket = tickets.find((t) => t.ticket_id === event.active.id);
    if (ticket) setActiveTicket(ticket);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicketItem = tickets.find((t) => t.ticket_id === activeId);
    if (!activeTicketItem) return;

    // Determine the target column
    const overColumn = COLUMNS.find((c) => c.id === overId);
    const overTicket = tickets.find((t) => t.ticket_id === overId);
    const targetStatus = overColumn?.id ?? overTicket?.ticket_status;

    // Track pending status change in local state (don't mutation yet)
    if (targetStatus && targetStatus !== activeTicketItem.ticket_status) {
      setPendingStatusChange((prev) => ({ ...prev, [activeId]: targetStatus }));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) {
      setPendingStatusChange({});
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Commit the pending status change if one exists
    const newStatus = pendingStatusChange[activeId];
    if (newStatus) {
      updateTicket.mutate({ id: activeId, body: { ticket_status: newStatus } });
      setPendingStatusChange({});
      return;
    }

    // If same column: handle reordering
    const activeItem = tickets.find((t) => t.ticket_id === activeId);
    const overItem = tickets.find((t) => t.ticket_id === overId);
    if (!activeItem || !overItem || activeItem.ticket_status !== overItem.ticket_status) {
      setPendingStatusChange({});
      return;
    }

    const colTickets: Ticket[] = columnMap.get(activeItem.ticket_status) ?? [];
    const oldIdx = colTickets.findIndex((t) => t.ticket_id === activeId);
    const newIdx = colTickets.findIndex((t) => t.ticket_id === overId);
    if (oldIdx === -1 || newIdx === -1) {
      setPendingStatusChange({});
      return;
    }

    const reordered = arrayMove(colTickets, oldIdx, newIdx);
    reordered.forEach((t, i) => {
      if (t.sort_order !== i) {
        updateTicket.mutate({ id: t.ticket_id, body: { sort_order: i } });
      }
    });
    setPendingStatusChange({});
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tickets={columnMap.get(col.id) ?? []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className={`${styles.card} ${styles.overlay}`}>
            <span className={styles.cardTitle}>{activeTicket.ticket_name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────

interface ColProps {
  column: (typeof COLUMNS)[number];
  tickets: Ticket[];
}

function KanbanColumn({ column, tickets }: ColProps) {
  const { openTicket } = useUIStore();

  return (
    <div className={styles.column}>
      <div className={styles.colHeader}>
        <span
          className={styles.colDot}
          style={{ background: column.color }}
        />
        <span className={styles.colLabel}>{column.label}</span>
        <span className={styles.colCount}>{tickets.length}</span>
      </div>

      <SortableContext
        id={column.id}
        items={tickets.map((t) => t.ticket_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.cards}>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.ticket_id}
              ticket={ticket}
              accentColor={column.color}
              onOpen={() => openTicket(ticket.ticket_id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── TicketCard ───────────────────────────────────────────────────────────

interface CardProps {
  ticket: Ticket;
  accentColor: string;
  onOpen: () => void;
}

function TicketCard({ ticket, accentColor, onOpen }: CardProps) {
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
    "--card-accent": accentColor,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      {...attributes}
      {...listeners}
      onClick={onOpen}
    >
      {ticket.category && (
        <span
          className={styles.categoryTag}
          style={{
            background: ticket.category.category_color + "33",
            color: ticket.category.category_color,
          }}
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
          <span className={styles.points}>{ticket.ticket_points} pts</span>
        )}
        {ticket.ticket_due && (
          <span
            className={styles.due}
            style={{
              color:
                new Date(ticket.ticket_due) < new Date()
                  ? "var(--danger)"
                  : "var(--text-muted)",
            }}
          >
            {new Date(ticket.ticket_due).toLocaleDateString()}
          </span>
        )}
        {ticket.assignees && ticket.assignees.length > 0 && (
          <div className={styles.avatars}>
            {ticket.assignees.slice(0, 3).map((a) => (
              <span
                key={a.user_id}
                className={styles.avatar}
                title={a.user.display_name ?? a.user.username}
              >
                {(a.user.display_name ?? a.user.username).charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
