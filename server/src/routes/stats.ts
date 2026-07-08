import { Router } from "express";
import { requireUserPermission } from "../middleware/requirePermission.js";
import { getAllUsersStats, getUserStats } from "../services/stats.js";

export const statsRouter = Router();

statsRouter.get("/me", (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({ stats: getUserStats(req.userId) });
});

statsRouter.get("/", requireUserPermission("stats.view"), (_req, res) => {
  res.json({ users: getAllUsersStats() });
});
