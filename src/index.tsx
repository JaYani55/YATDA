import type { ComponentType } from "react";
import BoardPage from "./pages/BoardPage";
import ConnectorSettingsPage from "./pages/ConnectorSettingsPage";

// ─── CMS Plugin Type Definitions ──────────────────────────────────────────
// These interfaces mirror what the CMS expects from a PluginDefinition object.
// The installed plugin's `src/index.tsx` is imported by the CMS registry.

interface PluginRoute {
  path: string;
  component: ComponentType;
  requiredRole?: string;
}

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
  group: string;
}

export interface ConfigSchemaEntry {
  key: string;
  type: "string" | "secret";
  label: string;
  description?: string;
  required?: boolean;
}

interface PluginDefinition {
  routes: PluginRoute[];
  sidebarItems: SidebarItem[];
  configSchema?: ConfigSchemaEntry[];
}

// ─── Plugin Definition ────────────────────────────────────────────────────

const plugin: PluginDefinition = {
  routes: [
    {
      path: "/plugins/yatda",
      component: BoardPage,
      requiredRole: "staff",
    },
    {
      path: "/plugins/yatda/connectors",
      component: ConnectorSettingsPage,
      requiredRole: "staff",
    },
  ],
  sidebarItems: [
    {
      label: "YATDA",
      path: "/plugins/yatda",
      icon: "kanban",
      group: "main",
    },
  ],
  configSchema: [
    {
      key: "google_client_id",
      type: "string",
      label: "Google Client ID",
      description: "OAuth 2.0 Client ID from Google Cloud Console",
      required: false,
    },
    {
      key: "google_client_secret",
      type: "secret",
      label: "Google Client Secret",
      description: "OAuth 2.0 Client Secret from Google Cloud Console",
      required: false,
    },
    {
      key: "google_redirect_uri",
      type: "string",
      label: "Google OAuth Redirect URI",
      description:
        "Must match the URI registered in Google Cloud Console (e.g. https://your-cms.com/api/plugins/yatda/connectors/google-tasks/callback)",
      required: false,
    },
    {
      key: "token_encryption_key",
      type: "secret",
      label: "Token Encryption Key",
      description:
        "Random secret used to AES-GCM-encrypt stored OAuth tokens (min 32 chars)",
      required: false,
    },
  ],
};

export default plugin;
