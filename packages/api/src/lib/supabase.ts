import { createClient } from "@supabase/supabase-js";
import type { Env } from "../types";
import { buildLocalClient } from "./localdb";

/**
 * Returns an authenticated Supabase client scoped to the requesting user.
 * Uses the user's own JWT so Supabase RLS policies fire correctly.
 * In LOCAL_TEST mode returns the in-memory local client instead.
 */
export function getUserSupabaseClient(env: Env, userJwt: string) {
  if (env.LOCAL_TEST === "true") {
    // Cast to any: the local client implements the same query-builder surface
    // used by the routes.  A union with any broadens the inferred return type
    // back to any, matching the original untyped Supabase client behaviour.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildLocalClient() as any;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
    auth: { persistSession: false },
  });
}

/**
 * Returns a service-role Supabase client (bypasses RLS).
 * Only use for internal sync operations where row-level security should not apply.
 * In LOCAL_TEST mode returns the in-memory local client instead.
 */
export function getServiceSupabaseClient(env: Env) {
  if (env.LOCAL_TEST === "true") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildLocalClient() as any;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
