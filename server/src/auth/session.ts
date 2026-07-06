import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_SECRET } from "../config.js";

export const AUTH_COOKIE_NAME = "lapviewer_uid";

export function signUserId(userId: string): string {
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(userId)
    .digest("base64url");
  return `${userId}.${signature}`;
}

export function verifySignedUserId(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!userId || !signature) return null;

  const expected = createHmac("sha256", SESSION_SECRET)
    .update(userId)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return userId;
}
