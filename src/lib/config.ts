// Reads YATDA plugin configuration stored in the CMS plugins table.
// Uses the CMS-provided supabase client (authenticated as the current user).
// Configuration is stored via the CMS admin plugin config UI.

import { supabase } from "@/lib/supabase";

export interface YatdaPluginConfig {
  google_client_id?: string;
  google_client_secret?: string;
  google_redirect_uri?: string;
  token_encryption_key?: string;
}

export async function getPluginConfig(): Promise<YatdaPluginConfig> {
  const { data, error } = await supabase
    .from("plugins")
    .select("config")
    .eq("slug", "yatda")
    .single();

  if (error || !data) return {};
  return (data.config ?? {}) as YatdaPluginConfig;
}

export function isGoogleTasksConfigured(cfg: YatdaPluginConfig): boolean {
  return !!(
    cfg.google_client_id &&
    cfg.google_client_secret &&
    cfg.google_redirect_uri &&
    cfg.token_encryption_key
  );
}
