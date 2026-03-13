export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  /** Symmetric encryption key for OAuth token storage (min 32 chars) */
  TOKEN_ENCRYPTION_KEY: string;
  /**
   * Set to "true" to enable local-test mode:
   * – JWT verification is bypassed (accepts the static token "localtest").
   * – All database calls use an in-memory SQLite-style store (no Supabase).
   * – Google Tasks connector routes return stubs.
   * Run with: wrangler dev --env localtest
   */
  LOCAL_TEST?: string;
}
