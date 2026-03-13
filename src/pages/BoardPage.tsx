import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";
import { useTickets } from "../hooks/useTickets";
import { useWorkspaces } from "../hooks/useWorkspaces";
import BoardHeader from "../components/layout/BoardHeader";
import KanbanView from "../components/views/KanbanView";
import ListView from "../components/views/ListView";
import GanttView from "../components/views/GanttView";
import CalendarView from "../components/views/CalendarView";
import TicketModal from "../components/modals/TicketModal";
import styles from "./BoardPage.module.css";

export default function BoardPage() {
  const { activeView, activeWorkspaceId, isTicketModalOpen, setWorkspace } = useUIStore();
  const { data: workspaces } = useWorkspaces();
  const { data: tickets = [], isLoading } = useTickets(activeWorkspaceId);

  // Auto-select the personal workspace (or first workspace) on initial load
  useEffect(() => {
    if (!activeWorkspaceId && workspaces?.length) {
      const personal = workspaces.find((w) => w.is_personal) ?? workspaces[0];
      setWorkspace(personal.workspace_id);
    }
  }, [workspaces, activeWorkspaceId, setWorkspace]);

  return (
    <div className={styles.main}>
      <BoardHeader ticketCount={tickets.length} />
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading tickets…</div>
        ) : (
          <>
            {activeView === "kanban" && <KanbanView tickets={tickets} workspaceId={activeWorkspaceId!} />}
            {activeView === "list" && <ListView tickets={tickets} workspaceId={activeWorkspaceId!} />}
            {activeView === "gantt" && <GanttView tickets={tickets} />}
            {activeView === "calendar" && <CalendarView tickets={tickets} />}
          </>
        )}
      </div>
      {isTicketModalOpen && <TicketModal />}
    </div>
  );
}
