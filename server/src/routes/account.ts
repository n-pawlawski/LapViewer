import { Router } from "express";
import { PERMISSION_DEFINITIONS } from "../auth/permissions.js";
import { getUserById, updateUserDisplayName, userToDto } from "../db/users.js";

export const accountRouter = Router();

accountRouter.get("/", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    user: req.user,
    permissionDefinitions: PERMISSION_DEFINITIONS,
  });
});

accountRouter.patch("/", (req, res) => {
  if (!req.userId || !req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const body = req.body as { displayName?: string };
  if (!body?.displayName?.trim()) {
    res.status(400).json({ error: "displayName is required" });
    return;
  }

  const updated = updateUserDisplayName(req.userId, body.displayName);
  if (!updated) {
    res.status(400).json({ error: "Invalid display name" });
    return;
  }

  res.json(userToDto(updated));
});
