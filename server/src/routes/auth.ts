import { Router, type Response } from "express";
import {
  buildGoogleAuthRedirect,
  finishGoogleAuth,
  OAUTH_STATE_COOKIE_NAME,
  readOAuthStateCookie,
} from "../auth/googleOAuth.js";
import { AUTH_COOKIE_NAME, signUserId } from "../auth/session.js";
import { CLIENT_ORIGIN, isDevUserMode, isGoogleAuthEnabled, isProductionDeploy } from "../config.js";
import { optionalAuth } from "../middleware/auth.js";
import { authenticateUser, userRowToDto } from "../services/auth.js";
import { recordUserLogin, recordUserLoginAsync } from "../services/stats.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProductionDeploy(),
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

const oauthCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProductionDeploy(),
  maxAge: 10 * 60 * 1000,
  path: "/api/auth",
};

function setAuthCookie(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE_NAME, signUserId(userId), cookieOptions);
}

function redirectWithAuthError(res: Response, message: string): void {
  const url = new URL(CLIENT_ORIGIN);
  url.searchParams.set("auth_error", message);
  res.redirect(url.toString());
}

authRouter.get("/config", (_req, res) => {
  res.json({
    googleAuthEnabled: isGoogleAuthEnabled(),
    devUserMode: isDevUserMode(),
  });
});

authRouter.get("/me", optionalAuth, (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.user);
});

authRouter.post("/register", (_req, res) => {
  res.status(410).json({
    error: "Password registration is disabled. Sign in with Google instead.",
  });
});

authRouter.post("/login", async (req, res) => {
  if (!isDevUserMode()) {
    res.status(403).json({ error: "Password login is only available in dev mode. Use Google sign-in." });
    return;
  }

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
  recordUserLogin(user.id);
  res.json(userRowToDto(user));
});

authRouter.get("/google", async (_req, res) => {
  try {
    const redirectTo = await buildGoogleAuthRedirect((value) => {
      res.cookie(OAUTH_STATE_COOKIE_NAME, value, oauthCookieOptions);
    });
    res.redirect(redirectTo);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in is unavailable";
    res.status(503).json({ error: message });
  }
});

authRouter.get("/google/callback", async (req, res) => {
  const stored = readOAuthStateCookie(req.cookies?.[OAUTH_STATE_COOKIE_NAME]);
  const result = await finishGoogleAuth(req, stored);

  if (result.ok) {
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: "/api/auth" });
    setAuthCookie(res, result.user.id);
    await recordUserLoginAsync(result.user.id);
    res.redirect(CLIENT_ORIGIN);
    return;
  }

  if (result.clearOAuthCookie) {
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: "/api/auth" });
  }
  redirectWithAuthError(res, result.error);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});
