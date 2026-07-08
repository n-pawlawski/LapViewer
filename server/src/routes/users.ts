import { Router } from "express";
import { sanitizePermissionInput } from "../auth/permissions.js";
import {
  getUserById,
  listUsers,
  updateUserPermissions,
  userToAdminDto,
} from "../db/users.js";
import { requirePermissionAdmin } from "../middleware/permissionAdmin.js";

export const usersRouter = Router();

usersRouter.use(requirePermissionAdmin);

usersRouter.get("/", (_req, res) => {
  const users = listUsers().map(userToAdminDto);
  res.json({ users });
});

usersRouter.patch("/:userId/permissions", (req, res) => {
  const { userId } = req.params;
  const target = getUserById(userId);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const body = req.body as { permissions?: unknown };
  const permissions = sanitizePermissionInput(body?.permissions);
  const updated = updateUserPermissions(userId, permissions);
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(userToAdminDto(updated));
});
