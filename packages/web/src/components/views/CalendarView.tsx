import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { useMemo } from "react";
import type { Ticket } from "../../lib/api";
import { useUIStore } from "../../store/uiStore";
import styles from "./CalendarView.module.css";

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

export default function CalendarView({ tickets }: Props) {
  const { openTicket } = useUIStore();

  const events = useMemo<EventInput[]>(() =>
    tickets
      .filter((t) => t.ticket_due)
      .map((t) => ({
        id: t.ticket_id,
        title: t.ticket_name,
        date: t.ticket_due!,
        backgroundColor: STATUS_COLORS[t.ticket_status] ?? "#6366f1",
        borderColor: STATUS_COLORS[t.ticket_status] ?? "#6366f1",
        textColor: "#fff",
        extendedProps: { ticket: t },
      })),
  [tickets]);

  function handleEventClick(info: EventClickArg) {
    openTicket(info.event.id);
  }

  return (
    <div className={styles.wrapper}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventClick={handleEventClick}
        height="calc(100vh - 160px)"
        themeSystem="standard"
      />
    </div>
  );
}
