import { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../types";

// Cache the JWKS per worker instance to avoid repeated fetches
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(supabaseUrl: string) {
  if (!cachedJWKS) {
    const jwksUri = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    cachedJWKS = createRemoteJWKSet(jwksUri);
  }
  return cachedJWKS;
}

export interface JWTPayload {
  sub: string;        // user UUID (auth.uid)
  role: string;       // 'authenticated' | 'anon'
  email?: string;
  aud: string;
  exp: number;
  iat: number;
}

declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: JWTPayload;
    userId: string;
  }
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches `jwtPayload` and `userId` to the Hono context.
 *
 * In LOCAL_TEST mode the static token "localtest" is accepted without any
 * cryptographic verification, and a fixed test user ID is used.
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or malformed Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  // ── Local-test shortcut ────────────────────────────────────────────────
  if (c.env.LOCAL_TEST === "true") {
    if (token !== "localtest") {
      return c.json({ error: "Invalid localtest token" }, 401);
    }
    const { LOCAL_TEST_USER_ID } = await import("../lib/localdb");
    const mockPayload: JWTPayload = {
      sub:   LOCAL_TEST_USER_ID,
      role:  "authenticated",
      email: "test@localtest.dev",
      aud:   "authenticated",
      exp:   9_999_999_999,
      iat:   Math.floor(Date.now() / 1000),
    };
    c.set("jwtPayload", mockPayload);
    c.set("userId", LOCAL_TEST_USER_ID);
    await next();
    return;
  }

  const jwks = getJWKS(c.env.SUPABASE_URL);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${c.env.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });

    const jwtPayload = payload as unknown as JWTPayload;

    if (!jwtPayload.sub) {
      return c.json({ error: "Invalid token: missing sub" }, 401);
    }

    c.set("jwtPayload", jwtPayload);
    c.set("userId", jwtPayload.sub);
    await next();
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message.includes("expired") ? "Token expired" : "Invalid token";
      return c.json({ error: msg }, 401);
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
}
