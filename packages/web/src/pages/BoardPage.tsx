import { useUIStore } from "../store/uiStore";
import { useTickets } from "../hooks/useTickets";
import Sidebar from "../components/layout/Sidebar";
import BoardHeader from "../components/layout/BoardHeader";
import KanbanView from "../components/views/KanbanView";
import ListView from "../components/views/ListView";
import GanttView from "../components/views/GanttView";
import CalendarView from "../components/views/CalendarView";
import TicketModal from "../components/modals/TicketModal";
import styles from "./BoardPage.module.css";

export default function BoardPage() {
  const { activeView, activeWorkspaceId, isTicketModalOpen } = useUIStore();
  const { data: tickets = [], isLoading } = useTickets(activeWorkspaceId);

  return (
    <div className={styles.root}>
      <Sidebar />
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
      </div>
      {isTicketModalOpen && <TicketModal />}
    </div>
  );
}
