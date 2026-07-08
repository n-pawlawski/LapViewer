import type { NextFunction, Request, Response } from "express";
import { userHasPermission, type PermissionKey } from "../auth/permissions.js";

export function requireUserPermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!userHasPermission(req.user.permissions, permission)) {
      res.status(403).json({ error: `Permission required: ${permission}` });
      return;
    }
    next();
  };
}
