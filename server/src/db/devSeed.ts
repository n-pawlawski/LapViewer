import { isDevUserMode } from "../config.js";
import { ensureDevUser } from "./users.js";

/** Seed the fixed dev user when dev mode is active. Returns user id or null. */
export function seedDevUserIfNeeded(): string | null {
  if (!isDevUserMode()) return null;
  const userId = ensureDevUser();
  console.log("Dev user ready:", userId);
  return userId;
}
