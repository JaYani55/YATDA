import { create } from "zustand";

export type ViewType = "kanban" | "list" | "gantt" | "calendar";

interface UIState {
  activeView: ViewType;
  activeWorkspaceId: string | null;
  selectedTicketId: string | null;
  isTicketModalOpen: boolean;
  filterStatus: string | null;
  filterCategoryId: string | null;
  searchQuery: string;

  setView: (view: ViewType) => void;
  setWorkspace: (id: string) => void;
  openTicket: (id: string | null) => void;
  closeTicketModal: () => void;
  setFilter: (key: "status" | "categoryId", value: string | null) => void;
  setSearch: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "kanban",
  activeWorkspaceId: null,
  selectedTicketId: null,
  isTicketModalOpen: false,
  filterStatus: null,
  filterCategoryId: null,
  searchQuery: "",

  setView: (view) => set({ activeView: view }),
  setWorkspace: (id) => set({ activeWorkspaceId: id, filterStatus: null, filterCategoryId: null }),
  openTicket: (id) => set({ selectedTicketId: id, isTicketModalOpen: true }),
  closeTicketModal: () => set({ isTicketModalOpen: false, selectedTicketId: null }),
  setFilter: (key, value) =>
    set(key === "status" ? { filterStatus: value } : { filterCategoryId: value }),
  setSearch: (q) => set({ searchQuery: q }),
}));
