import type { SupabaseClient } from "@supabase/supabase-js";

export interface YatdaPluginConfig {
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
  token_encryption_key: string;
}

/** Read YATDA plugin config stored in the CMS plugins table.
 *  Requires an admin (service-role) Supabase client. */
export async function getPluginConfig(
  adminClient: SupabaseClient
): Promise<YatdaPluginConfig | null> {
  const { data, error } = await adminClient
    .from("plugins")
    .select("config")
    .eq("slug", "yatda")
    .single();

  if (error || !data?.config) return null;
  return data.config as YatdaPluginConfig;
}

export function isConfigured(cfg: YatdaPluginConfig | null): cfg is YatdaPluginConfig {
  return !!(
    cfg?.google_client_id &&
    cfg?.google_client_secret &&
    cfg?.google_redirect_uri &&
    cfg?.token_encryption_key
  );
}
