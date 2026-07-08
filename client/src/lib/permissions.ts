import type { AuthUser } from "../api/auth";

export type PermissionKey =
  | "sessions.delete"
  | "tracks.manage"
  | "users.manage"
  | "stats.view";

export function hasPermission(user: AuthUser | null | undefined, key: PermissionKey): boolean {
  if (!user) return false;
  return user.permissions.includes(key);
}

export function canViewStats(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return hasPermission(user, "stats.view") || user.canManagePermissions;
}
