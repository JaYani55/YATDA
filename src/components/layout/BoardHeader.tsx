import { useUIStore } from "../../store/uiStore";
import { useWorkspaces } from "../../hooks/useWorkspaces";
import styles from "./BoardHeader.module.css";

interface Props {
  ticketCount: number;
}

export default function BoardHeader({ ticketCount }: Props) {
  const { activeView, activeWorkspaceId, setView, openTicket, searchQuery, setSearch } = useUIStore();
  const { data: workspaces = [] } = useWorkspaces();
  const ws = workspaces.find((w) => w.workspace_id === activeWorkspaceId);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{ws?.name ?? "Board"}</h1>
        <span className={styles.count}>{ticketCount} tickets</span>
      </div>

      <div className={styles.right}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search tickets…"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.viewToggle}>
          {(["kanban", "list", "gantt", "calendar"] as const).map((v) => (
            <button
              key={v}
              className={`${styles.viewBtn} ${activeView === v ? styles.active : ""}`}
              onClick={() => setView(v)}
              title={v.charAt(0).toUpperCase() + v.slice(1)}
            >
              {VIEW_ICONS[v]}
            </button>
          ))}
        </div>

        {activeWorkspaceId && (
          <button className={styles.addBtn} onClick={() => openTicket(null)}>
            + Add Task
          </button>
        )}
      </div>
    </header>
  );
}

const VIEW_ICONS: Record<string, string> = {
  kanban: "⊞",
  list: "≡",
  gantt: "▦",
  calendar: "▦",
};
