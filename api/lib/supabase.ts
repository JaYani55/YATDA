import { createClient } from "@supabase/supabase-js";

/** Cloudflare Secrets Store binding — value is not available at import time. */
interface SecretsStoreBinding {
  get(): Promise<string>;
}

export interface PluginEnv {
  SUPABASE_URL: string;
  /** Plain environment variable (set via .dev.vars locally, wrangler vars in production). */
  SUPABASE_PUBLISHABLE_KEY: string;
  /** Cloudflare Secrets Store binding — call `.get()` to retrieve the value. */
  SS_SUPABASE_SECRET_KEY: SecretsStoreBinding;
}

/** User-scoped Supabase client — respects RLS using the caller's JWT.
 *  Use this for ALL user-facing route handlers. */
export function getSupabaseClient(env: PluginEnv, token: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Service-role Supabase client — bypasses RLS entirely.
 *  Use ONLY for privileged bootstrap operations (e.g. POST /users/me/ensure)
 *  and OAuth credential storage where no user JWT is available.
 *  Async because SS_SUPABASE_SECRET_KEY is a Cloudflare Secrets Store binding. */
export async function getSupabaseAdminClient(env: PluginEnv) {
  const key = await env.SS_SUPABASE_SECRET_KEY.get();
  return createClient(env.SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Extract the user ID from a JWT payload without making a network call.
 *  Safe because we trust the JWT issuer (Supabase) and all DB calls
 *  still go through RLS using the user's token. */
export function getUserIdFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub as string;
  } catch {
    return "";
  }
}
