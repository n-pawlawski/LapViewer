import * as client from "openid-client";
import type { Request } from "express";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  googleRedirectUri,
  isGoogleAuthEnabled,
} from "../config.js";
import { findOrCreateGoogleUserAsync, type GoogleProfile } from "../services/auth.js";
import {
  createOAuthState,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
  OAUTH_STATE_COOKIE_NAME,
  type OAuthStatePayload,
} from "./oauthState.js";
import type { UserRow } from "../db/users.js";

let googleConfig: client.Configuration | null = null;

async function getGoogleConfig(): Promise<client.Configuration> {
  if (!googleConfig) {
    googleConfig = await client.discovery(
      new URL("https://accounts.google.com"),
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
    );
  }
  return googleConfig;
}

export type GoogleAuthResult =
  | { ok: true; user: UserRow }
  | { ok: false; error: string; clearOAuthCookie?: boolean };

function profileFromClaims(claims: Record<string, unknown>): GoogleProfile {
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const displayName =
    typeof claims.name === "string"
      ? claims.name
      : typeof claims.given_name === "string"
        ? claims.given_name
        : email.split("@")[0] ?? "User";
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";

  return { sub, email, displayName, emailVerified };
}

export async function buildGoogleAuthRedirect(
  setOAuthCookie: (value: string) => void,
): Promise<string> {
  if (!isGoogleAuthEnabled()) {
    throw new Error("Google sign-in is not configured");
  }

  const config = await getGoogleConfig();
  const redirectUri = googleRedirectUri();
  const oauthState = createOAuthState();
  const codeChallenge = await client.calculatePKCECodeChallenge(oauthState.codeVerifier);

  const redirectTo = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state: oauthState.state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  setOAuthCookie(encodeOAuthStateCookie(oauthState));
  return redirectTo.toString();
}

export async function finishGoogleAuth(
  req: Request,
  stored: OAuthStatePayload | null,
): Promise<GoogleAuthResult> {
  if (!isGoogleAuthEnabled()) {
    return { ok: false, error: "Google sign-in is not configured" };
  }

  if (!stored) {
    return { ok: false, error: "Sign-in session expired. Try again.", clearOAuthCookie: true };
  }

  const queryState = typeof req.query.state === "string" ? req.query.state : "";
  if (!queryState || queryState !== stored.state) {
    return { ok: false, error: "Invalid sign-in state. Try again.", clearOAuthCookie: true };
  }

  if (typeof req.query.error === "string") {
    const description =
      typeof req.query.error_description === "string"
        ? req.query.error_description
        : req.query.error;
    return { ok: false, error: description, clearOAuthCookie: true };
  }

  try {
    const config = await getGoogleConfig();
    const redirectUri = googleRedirectUri();
    const callbackUrl = new URL(redirectUri);
    const query = new URLSearchParams(req.url.split("?")[1] ?? "");
    callbackUrl.search = query.toString();

    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: stored.codeVerifier,
      expectedState: stored.state,
    });

    const claims = tokens.claims() as Record<string, unknown> | undefined;
    if (!claims) {
      return { ok: false, error: "Google did not return a user profile.", clearOAuthCookie: true };
    }

    const user = await findOrCreateGoogleUserAsync(profileFromClaims(claims));
    return { ok: true, user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    return { ok: false, error: message, clearOAuthCookie: true };
  }
}

export function readOAuthStateCookie(cookieValue: string | undefined): OAuthStatePayload | null {
  if (!cookieValue) return null;
  return decodeOAuthStateCookie(cookieValue);
}

export { OAUTH_STATE_COOKIE_NAME };
