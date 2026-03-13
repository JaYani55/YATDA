import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useUIStore } from "./store/uiStore";
import { useWorkspaces } from "./hooks/useWorkspaces";
import LoginPage from "./pages/LoginPage";
import BoardPage from "./pages/BoardPage";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={session ? <AuthedApp /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function AuthedApp() {
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setWorkspace } = useUIStore();

  // Auto-select the first workspace (personal board) on initial load
  useEffect(() => {
    if (!activeWorkspaceId && workspaces?.length) {
      const personal = workspaces.find((w) => w.is_personal) ?? workspaces[0];
      setWorkspace(personal.workspace_id);
    }
  }, [workspaces, activeWorkspaceId, setWorkspace]);

  return <BoardPage />;
}
