import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SESSION_SECRET } from "../config.js";

export const OAUTH_STATE_COOKIE_NAME = "lapviewer_oauth";

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
}

function signPayload(encoded: string): string {
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedPayload(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature) return null;

  const expected = createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return encoded;
}

export function createOAuthState(): OAuthStatePayload {
  return {
    state: randomBytes(16).toString("base64url"),
    codeVerifier: randomBytes(32).toString("base64url"),
  };
}

export function encodeOAuthStateCookie(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return signPayload(encoded);
}

export function decodeOAuthStateCookie(token: string): OAuthStatePayload | null {
  const encoded = verifySignedPayload(token);
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!parsed.state || !parsed.codeVerifier) return null;
    return parsed;
  } catch {
    return null;
  }
}
