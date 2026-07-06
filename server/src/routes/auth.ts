import { Router, type Response } from "express";
import { AUTH_COOKIE_NAME, signUserId } from "../auth/session.js";
import { optionalAuth } from "../middleware/auth.js";
import { authenticateUser, registerUser, userRowToDto } from "../services/auth.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

function setAuthCookie(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE_NAME, signUserId(userId), cookieOptions);
}

authRouter.get("/me", optionalAuth, (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.user);
});

authRouter.post("/register", async (req, res) => {
  const body = req.body as { email?: string; password?: string; displayName?: string };
  if (!body?.email || !body?.password || !body?.displayName) {
    res.status(400).json({ error: "email, password, and displayName are required" });
    return;
  }

  try {
    const user = await registerUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });
    setAuthCookie(res, user.id);
    res.status(201).json(userRowToDto(user));
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === "DUPLICATE_EMAIL") {
      res.status(409).json({ error: error.message });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const body = req.body as { email?: string; password?: string };
  if (!body?.email || !body?.password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await authenticateUser(body.email, body.password);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  setAuthCookie(res, user.id);
  res.json(userRowToDto(user));
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});
