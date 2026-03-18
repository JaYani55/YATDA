import { useEffect, useState } from "react";
import { useUIStore } from "../store/uiStore";
import { useTickets } from "../hooks/useTickets";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { usersApi } from "../lib/api";
import BoardHeader from "../components/layout/BoardHeader";
import KanbanView from "../components/views/KanbanView";
import ListView from "../components/views/ListView";
import GanttView from "../components/views/GanttView";
import CalendarView from "../components/views/CalendarView";
import TicketModal from "../components/modals/TicketModal";
import styles from "./BoardPage.module.css";

export default function BoardPage() {
  const { activeView, activeWorkspaceId, isTicketModalOpen, setWorkspace, filterStatus, filterCategoryId } = useUIStore();
  const { data: workspaces, isLoading: isLoadingWorkspaces, refetch: refetchWorkspaces } = useWorkspaces();
  const { data: tickets = [], isLoading } = useTickets(activeWorkspaceId, {
    status: filterStatus ?? undefined,
    categoryId: filterCategoryId ?? undefined,
  });
  const [ensureAttempted, setEnsureAttempted] = useState(false);

  // On first load, if user has no workspaces, call POST /users/me/ensure to provision them
  // This handles existing CMS users who were created before YATDA was installed
  useEffect(() => {
    if (!ensureAttempted && !isLoadingWorkspaces && workspaces?.length === 0) {
      setEnsureAttempted(true);
      usersApi
        .ensure()
        .then(() => {
          // Re-fetch workspaces after provisioning
          refetchWorkspaces();
        })
        .catch((err) => {
          console.error("Failed to ensure user provisioning:", err);
        });
    }
  }, [isLoadingWorkspaces, workspaces, ensureAttempted, refetchWorkspaces]);

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
        {isLoading || isLoadingWorkspaces ? (
          <div className={styles.loading}>Loading…</div>
        ) : !activeWorkspaceId ? (
          <div className={styles.loading}>Creating your workspace…</div>
        ) : (
          <>
            {activeView === "kanban" && <KanbanView tickets={tickets} workspaceId={activeWorkspaceId} />}
            {activeView === "list" && <ListView tickets={tickets} workspaceId={activeWorkspaceId} />}
            {activeView === "gantt" && <GanttView tickets={tickets} />}
            {activeView === "calendar" && <CalendarView tickets={tickets} />}
          </>
        )}
      </div>
      {isTicketModalOpen && <TicketModal />}
    </div>
  );
}
