import { useQuery } from "@tanstack/react-query";
import { workspacesApi, type Workspace } from "../lib/api";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.list(),
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspacesApi.getMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}
