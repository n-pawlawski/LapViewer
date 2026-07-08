import { useEffect, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { canViewStats, hasPermission, type PermissionKey } from "../lib/permissions";
import { useRouter } from "../lib/router";

interface RequirePermissionProps {
  children: ReactNode;
  permission?: PermissionKey;
  requireStatsAccess?: boolean;
  requirePermissionAdmin?: boolean;
  redirectTo?: string;
}

export function RequirePermission({
  children,
  permission,
  requireStatsAccess = false,
  requirePermissionAdmin = false,
  redirectTo = "/",
}: RequirePermissionProps) {
  const { user, status } = useAuth();
  const { navigate } = useRouter();

  const allowed =
    status === "authenticated" &&
    user != null &&
    (!requirePermissionAdmin || user.canManagePermissions) &&
    (!requireStatsAccess || canViewStats(user)) &&
    (!permission || hasPermission(user, permission));

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") return;
    if (!allowed) {
      navigate(redirectTo);
    }
  }, [allowed, navigate, redirectTo, status]);

  if (status === "loading" || !allowed) {
    return null;
  }

  return children;
}
