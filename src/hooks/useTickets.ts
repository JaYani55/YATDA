import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi, type Ticket, type CreateTicketBody } from "../lib/api";

export const TICKETS_KEY = (workspaceId: string, opts?: { status?: string; categoryId?: string }) =>
  ["tickets", workspaceId, opts?.status, opts?.categoryId];

export function useTickets(
  workspaceId: string | null,
  opts?: { status?: string; categoryId?: string }
) {
  return useQuery({
    queryKey: TICKETS_KEY(workspaceId ?? "", opts),
    queryFn: () =>
      ticketsApi.list({
        workspace_id: workspaceId!,
        status: opts?.status,
        category_id: opts?.categoryId,
      }),
    enabled: !!workspaceId,
  });
}

export function useTicket(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketsApi.get(ticketId!),
    enabled: !!ticketId,
  });
}

export function useCreateTicket(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketBody) => ticketsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId] }),
  });
}

export function useUpdateTicket(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateTicketBody & { sort_order: number }> }) =>
      ticketsApi.update(id, body),
    onMutate: async ({ id, body }) => {
      // Optimistic update for status changes (critical for drag & drop feel)
      await qc.cancelQueries({ queryKey: ["tickets", workspaceId] });
      const prev = qc.getQueryData<Ticket[]>(["tickets", workspaceId]);
      if (prev) {
        qc.setQueryData<Ticket[]>(
          ["tickets", workspaceId],
          prev.map((t) => (t.ticket_id === id ? { ...t, ...body } : t))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tickets", workspaceId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId] }),
  });
}

export function useDeleteTicket(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId] }),
  });
}
