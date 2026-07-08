import { DEV_USER_ID } from "../db/users.js";
import { normalizeEmail } from "../services/auth.js";

/** Accounts allowed to view and edit the permissions panel. */
const PERMISSION_ADMIN_EMAILS = new Set(["nick.pawlawski@gmail.com"]);

export const PERMISSION_DEFINITIONS = [
  { key: "sessions.delete", label: "Delete sessions" },
  { key: "tracks.manage", label: "Manage tracks" },
  { key: "users.manage", label: "Manage users" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]["key"];

const VALID_PERMISSION_KEYS = new Set<string>(PERMISSION_DEFINITIONS.map((item) => item.key));

export function canManagePermissions(user: { id: string; email: string }): boolean {
  if (user.id === DEV_USER_ID) return true;
  return PERMISSION_ADMIN_EMAILS.has(normalizeEmail(user.email));
}

export function parsePermissionsJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && VALID_PERMISSION_KEYS.has(item));
  } catch {
    return [];
  }
}

export function serializePermissions(permissions: string[]): string {
  const unique = [...new Set(permissions.filter((key) => VALID_PERMISSION_KEYS.has(key)))];
  unique.sort();
  return JSON.stringify(unique);
}

export function sanitizePermissionInput(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((item): item is string => typeof item === "string" && VALID_PERMISSION_KEYS.has(item));
}

export function userHasPermission(userPermissions: string[], key: PermissionKey): boolean {
  return userPermissions.includes(key);
}
