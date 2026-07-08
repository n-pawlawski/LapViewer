import type { NextFunction, Request, Response } from "express";
import { canManagePermissions } from "../auth/permissions.js";
import { getUserById } from "../db/users.js";

export function requirePermissionAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = getUserById(req.userId);
  if (!user || !canManagePermissions(user)) {
    res.status(403).json({ error: "Permission admin access required" });
    return;
  }

  next();
}
