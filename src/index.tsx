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

interface PluginDefinition {
  routes: PluginRoute[];
  sidebarItems: SidebarItem[];
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
};

export default plugin;
