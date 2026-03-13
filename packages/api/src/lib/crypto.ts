/**
 * Simple symmetric encryption/decryption using AES-GCM via the Web Crypto API.
 * Used to protect OAuth tokens before storing them in Supabase.
 * The encryption key is stored as a Cloudflare Worker secret (TOKEN_ENCRYPTION_KEY).
 */

async function deriveKey(rawKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(rawKey.padEnd(32, "0").slice(0, 32)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("yatda-token-salt"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt plaintext to a base64url string. Format: base64(iv):base64(ciphertext) */
export async function encryptToken(plaintext: string, rawKey: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await deriveKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

/** Decrypt a base64url string back to plaintext. */
export async function decryptToken(encrypted: string, rawKey: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(":");
  if (!ivB64 || !ctB64) throw new Error("Invalid encrypted token format");

  const dec = new TextDecoder();
  const key = await deriveKey(rawKey);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return dec.decode(plaintext);
}
