import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, verifySignedUserId } from "../auth/session.js";
import { getUserById, userToDto } from "../db/users.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const userId = verifySignedUserId(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }

  const user = getUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.userId = userId;
  req.user = userToDto(user);
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token === "string") {
    const userId = verifySignedUserId(token);
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        req.userId = userId;
        req.user = userToDto(user);
      }
    }
  }
  next();
}
