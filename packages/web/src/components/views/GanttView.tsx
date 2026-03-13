import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useMemo, useState } from "react";
import type { Ticket } from "../../lib/api";
import { useUIStore } from "../../store/uiStore";
import styles from "./GanttView.module.css";

interface Props {
  tickets: Ticket[];
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "#6366f1",
  assigned: "#f59e0b",
  in_progress: "#ec4899",
  review: "#8b5cf6",
  done: "#22c55e",
};

export default function GanttView({ tickets }: Props) {
  const { openTicket } = useUIStore();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

  const tasks = useMemo<Task[]>(() => {
    const now = new Date();
    return tickets
      .filter((t) => t.ticket_date || t.ticket_due)
      .map((t): Task => {
        const start = t.ticket_date ? new Date(t.ticket_date) : new Date(t.created_at);
        const end = t.ticket_due
          ? new Date(t.ticket_due)
          : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // default 1 week

        // Ensure end >= start
        const safeEnd = end <= start ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : end;

        // Calculate progress based on phase timestamps
        const progress = t.ticket_status === "done" ? 100
          : t.ticket_status === "review" ? 80
          : t.ticket_status === "in_progress" ? 50
          : t.ticket_status === "assigned" ? 20
          : 0;

        return {
          id: t.ticket_id,
          name: t.ticket_name,
          start,
          end: safeEnd,
          progress,
          type: "task",
          styles: {
            progressColor: STATUS_COLORS[t.ticket_status] ?? "#6366f1",
            progressSelectedColor: STATUS_COLORS[t.ticket_status] ?? "#6366f1",
            backgroundColor: (STATUS_COLORS[t.ticket_status] ?? "#6366f1") + "40",
            backgroundSelectedColor: (STATUS_COLORS[t.ticket_status] ?? "#6366f1") + "80",
          },
        };
      });
  }, [tickets]);

  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No tickets with dates to display.</p>
        <p>Add a start date or due date to a ticket to see it here.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as ViewMode[]).map((m) => (
          <button
            key={m}
            className={`${styles.modeBtn} ${viewMode === m ? styles.active : ""}`}
            onClick={() => setViewMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className={styles.ganttWrap}>
        <Gantt
          tasks={tasks}
          viewMode={viewMode}
          onDoubleClick={(task) => openTicket(task.id)}
          listCellWidth="200px"
          columnWidth={viewMode === ViewMode.Month ? 200 : viewMode === ViewMode.Week ? 120 : 60}
          barFill={80}
          fontSize="12"
          todayColor="rgba(99,102,241,0.12)"
        />
      </div>
    </div>
  );
}
