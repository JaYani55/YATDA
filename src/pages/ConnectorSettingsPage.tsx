import { useState, useEffect } from "react";
import { googleTasksApi } from "../lib/api";
// CMS shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GoogleTasksStatus {
  connected: boolean;
  credential?: {
    token_expiry: string | null;
    scope: string | null;
    updated_at: string;
  } | null;
}

export default function ConnectorSettingsPage() {
  const [status, setStatus] = useState<GoogleTasksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    googleTasksApi
      .status()
      .then((s) => setStatus(s as GoogleTasksStatus))
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  function handleConnect() {
    googleTasksApi.connect();
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSyncSuccess(false);
    try {
      await googleTasksApi.sync();
      setSyncSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Tasks? This will remove your stored credentials.")) return;
    setError(null);
    try {
      await googleTasksApi.disconnect();
      setStatus({ connected: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "640px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
        YATDA Connectors
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
        Connect external task providers to sync tasks with your YATDA boards.
      </p>

      <Card>
        <CardHeader>
          <CardTitle
            style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "16px" }}
          >
            Google Tasks
            {!loading && (
              <Badge variant={status?.connected ? "default" : "secondary"}>
                {status?.connected ? "Connected" : "Not connected"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
            Bidirectional sync between Google Tasks and your YATDA personal board. Tasks
            imported from Google appear in your Backlog column.
          </p>

          {status?.connected && status.credential && (
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "12px" }}>
              Last synced:{" "}
              {status.credential.updated_at
                ? new Date(status.credential.updated_at).toLocaleString()
                : "never"}
            </p>
          )}

          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                background: "rgba(239,68,68,0.1)",
                padding: "8px 12px",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          {syncSuccess && (
            <p
              style={{
                color: "#22c55e",
                fontSize: "13px",
                background: "rgba(34,197,94,0.1)",
                padding: "8px 12px",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              Sync completed successfully.
            </p>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            {status?.connected ? (
              <>
                <Button onClick={handleSync} disabled={syncing || loading}>
                  {syncing ? "Syncing…" : "Sync now"}
                </Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? "Loading…" : "Connect Google Tasks"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
