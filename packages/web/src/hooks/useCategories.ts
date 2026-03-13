import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "../lib/api";

export function useCategories(workspaceId: string | null) {
  return useQuery({
    queryKey: ["categories", workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: !!workspaceId,
  });
}
