import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const IS_LOCAL_TEST = import.meta.env.VITE_LOCAL_TEST === "true";
const LOCAL_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/** Fake session used in localtest mode — no Supabase connection needed. */
const MOCK_SESSION = {
  access_token:  "localtest",
  refresh_token: "localtest-refresh",
  expires_at:    9_999_999_999,
  expires_in:    9_999_999_999,
  token_type:    "bearer",
  user: {
    id:             LOCAL_TEST_USER_ID,
    email:          "test@localtest.dev",
    role:           "authenticated",
    app_metadata:   {},
    user_metadata:  { display_name: "Local Test User" },
    aud:            "authenticated",
    created_at:     "2026-03-13T00:00:00Z",
  },
} as unknown as Session;

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(
    IS_LOCAL_TEST ? MOCK_SESSION : undefined,
  );

  useEffect(() => {
    if (IS_LOCAL_TEST) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    loading: IS_LOCAL_TEST ? false : session === undefined,
    user: session?.user ?? null,
    signIn: IS_LOCAL_TEST
      ? async (_e: string, _p: string) => ({ data: { session: MOCK_SESSION, user: MOCK_SESSION.user }, error: null })
      : (email: string, password: string) =>
          supabase.auth.signInWithPassword({ email, password }),
    signInWithGoogle: IS_LOCAL_TEST
      ? async () => ({ data: { provider: "google" as const, url: "" }, error: null })
      : () =>
          supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }),
    signUp: IS_LOCAL_TEST
      ? async (_e: string, _p: string) => ({ data: { session: MOCK_SESSION, user: MOCK_SESSION.user }, error: null })
      : (email: string, password: string) =>
          supabase.auth.signUp({ email, password }),
    signOut: IS_LOCAL_TEST
      ? async () => {}
      : () => supabase.auth.signOut(),
  };
}
