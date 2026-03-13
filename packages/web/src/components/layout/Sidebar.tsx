import { useAuth } from "../../hooks/useAuth";
import { useWorkspaces } from "../../hooks/useWorkspaces";
import { useUIStore, type ViewType } from "../../store/uiStore";
import styles from "./Sidebar.module.css";

const NAV_ITEMS: { label: string; view: ViewType; icon: string }[] = [
  { label: "Kanban", view: "kanban", icon: "⬜" },
  { label: "List", view: "list", icon: "☰" },
  { label: "Gantt", view: "gantt", icon: "📊" },
  { label: "Calendar", view: "calendar", icon: "📅" },
];

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const { data: workspaces = [] } = useWorkspaces();
  const { activeView, activeWorkspaceId, setView, setWorkspace } = useUIStore();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>YATDA</div>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Workspaces</p>
        {workspaces.map((ws) => (
          <button
            key={ws.workspace_id}
            className={`${styles.wsBtn} ${activeWorkspaceId === ws.workspace_id ? styles.active : ""}`}
            onClick={() => setWorkspace(ws.workspace_id)}
          >
            <span className={styles.wsIcon}>{ws.icon ?? "🗂️"}</span>
            <span className={styles.wsName}>{ws.name}</span>
            {ws.is_personal && <span className={styles.personalBadge}>personal</span>}
          </button>
        ))}
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Views</p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={`${styles.navBtn} ${activeView === item.view ? styles.active : ""}`}
            onClick={() => setView(item.view)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </section>

      <div className={styles.spacer} />

      <div className={styles.userSection}>
        <div className={styles.userEmail}>{user?.email}</div>
        <button className={styles.signOutBtn} onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
