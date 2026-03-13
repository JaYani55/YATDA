import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import type { Ticket, TicketStatus } from "../../lib/api";
import { useUpdateTicket } from "../../hooks/useTickets";
import { useUIStore } from "../../store/uiStore";
import styles from "./ListView.module.css";

const STATUS_COLORS: Record<TicketStatus, string> = {
  backlog: "#6366f1",
  assigned: "#f59e0b",
  in_progress: "#ec4899",
  review: "#8b5cf6",
  done: "#22c55e",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "Backlog",
  assigned: "Assigned",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const helper = createColumnHelper<Ticket>();

interface Props {
  tickets: Ticket[];
  workspaceId: string;
}

export default function ListView({ tickets, workspaceId }: Props) {
  const { openTicket, searchQuery } = useUIStore();
  const updateTicket = useUpdateTicket(workspaceId);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      helper.accessor("ticket_name", {
        header: "Title",
        cell: (info) => (
          <button
            className={styles.titleBtn}
            onClick={() => openTicket(info.row.original.ticket_id)}
          >
            {info.getValue()}
          </button>
        ),
      }),
      helper.accessor("ticket_status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <select
              className={styles.statusSelect}
              style={{ color: STATUS_COLORS[status] }}
              value={status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateTicket.mutate({
                  id: info.row.original.ticket_id,
                  body: { ticket_status: e.target.value as TicketStatus },
                })
              }
            >
              {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          );
        },
      }),
      helper.accessor("category", {
        header: "Category",
        cell: (info) => {
          const cat = info.getValue();
          if (!cat) return <span className={styles.empty}>—</span>;
          return (
            <span
              className={styles.catTag}
              style={{ background: cat.category_color + "33", color: cat.category_color }}
            >
              {cat.category_name}
            </span>
          );
        },
      }),
      helper.accessor("ticket_points", {
        header: "Points",
        cell: (info) => {
          const v = info.getValue();
          return v !== null ? (
            <span className={styles.points}>{v}</span>
          ) : (
            <span className={styles.empty}>—</span>
          );
        },
      }),
      helper.accessor("ticket_due", {
        header: "Due Date",
        cell: (info) => {
          const due = info.getValue();
          if (!due) return <span className={styles.empty}>—</span>;
          const overdue = new Date(due) < new Date();
          return (
            <span style={{ color: overdue ? "var(--danger)" : "var(--text-muted)" }}>
              {new Date(due).toLocaleDateString()}
            </span>
          );
        },
      }),
      helper.accessor("assignees", {
        header: "Assignees",
        enableSorting: false,
        cell: (info) => {
          const assignees = info.getValue();
          if (!assignees?.length) return <span className={styles.empty}>—</span>;
          return (
            <div className={styles.avatars}>
              {assignees.slice(0, 3).map((a) => (
                <span key={a.user_id} className={styles.avatar} title={a.user.username}>
                  {(a.user.display_name ?? a.user.username).charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          );
        },
      }),
      helper.accessor("created_at", {
        header: "Created",
        cell: (info) => (
          <span className={styles.date}>
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
    ],
    [openTicket, updateTicket]
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, globalFilter: searchQuery },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className={`${styles.th} ${header.column.getCanSort() ? styles.sortable : ""}`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" && " ↑"}
                  {header.column.getIsSorted() === "desc" && " ↓"}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={styles.tr}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={styles.td}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className={styles.empty} style={{ textAlign: "center", padding: "40px" }}>
                No tickets found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
