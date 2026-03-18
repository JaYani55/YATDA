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
    // Invalidate all ticket queries for this workspace (including filtered queries)
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId], exact: false }),
  });
}

export function useUpdateTicket(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateTicketBody & { sort_order: number }> }) =>
      ticketsApi.update(id, body),
    onMutate: async ({ id, body }) => {
      // Optimistic update for status changes across all cache keys (including filtered queries)
      // Use prefix match to target ["tickets", workspaceId, ...] with any filter combination
      await qc.cancelQueries({ queryKey: ["tickets", workspaceId], exact: false });
      
      // Get the unfiltered cache data for optimistic update
      const cacheKey = ["tickets", workspaceId, undefined, undefined];
      const prev = qc.getQueryData<Ticket[]>(cacheKey);
      if (prev) {
        qc.setQueryData<Ticket[]>(
          cacheKey,
          prev.map((t) => (t.ticket_id === id ? { ...t, ...body } : t))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tickets", workspaceId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId], exact: false }),
  });
}

export function useDeleteTicket(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", workspaceId] }),
  });
}
