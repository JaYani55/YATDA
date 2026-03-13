import { createClient } from "@supabase/supabase-js";

export interface PluginEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
}

/** User-scoped Supabase client — respects RLS using the caller's JWT. */
export function getSupabaseClient(env: PluginEnv, token: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Service-role Supabase client — bypasses RLS; use only in trusted server contexts. */
export function getSupabaseAdminClient(env: PluginEnv) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
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
