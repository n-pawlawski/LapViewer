import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { serializePermissions } from "../auth/permissions.js";
import { getDbKind, getPgPool } from "../db/database.js";
import {
  createUser,
  DEV_USER_LOGIN,
  getUserByEmail,
  getUserByGoogleSub,
  getUserById,
  linkGoogleSub,
  userToDto,
  type UserDto,
  type UserRow,
} from "../db/users.js";

const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface GoogleProfile {
  sub: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

function userRowFromPg(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: (row.displayname ?? row.displayName) as string,
    passwordHash: (row.passwordhash ?? row.passwordHash ?? null) as string | null,
    googleSub: (row.googlesub ?? row.googleSub ?? null) as string | null,
    role: row.role as string,
    permissions: (row.permissions ?? null) as string | null,
    createdAt: String(row.createdat ?? row.createdAt),
  };
}

function validateGoogleProfile(profile: GoogleProfile): { email: string; displayName: string } {
  if (!profile.sub) {
    throw Object.assign(new Error("Google account is missing a subject id"), { code: "VALIDATION" });
  }
  if (!profile.emailVerified) {
    throw Object.assign(new Error("Google account email is not verified"), {
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  const email = normalizeEmail(profile.email);
  if (!email || !isValidEmail(email)) {
    throw Object.assign(new Error("Google account email is invalid"), { code: "VALIDATION" });
  }

  const displayName = profile.displayName.trim() || email.split("@")[0] || "User";
  return { email, displayName };
}

export function findOrCreateGoogleUser(profile: GoogleProfile): UserRow {
  const { email, displayName } = validateGoogleProfile(profile);

  const bySub = getUserByGoogleSub(profile.sub);
  if (bySub) return bySub;

  const existing = getUserByEmail(email);
  if (existing) {
    if (existing.googleSub && existing.googleSub !== profile.sub) {
      throw Object.assign(new Error("An account already exists for this email"), {
        code: "ACCOUNT_CONFLICT",
      });
    }
    if (!existing.googleSub) {
      linkGoogleSub(existing.id, profile.sub);
      return getUserById(existing.id)!;
    }
    return existing;
  }

  return createUser({
    email,
    displayName,
    passwordHash: null,
    googleSub: profile.sub,
  });
}

export async function findOrCreateGoogleUserAsync(profile: GoogleProfile): Promise<UserRow> {
  if (getDbKind() !== "postgres") {
    return findOrCreateGoogleUser(profile);
  }

  const pool = getPgPool();
  if (!pool) {
    throw new Error("Postgres pool not initialized. Call initDatabase() first.");
  }

  const { email, displayName } = validateGoogleProfile(profile);

  const bySubResult = await pool.query(`SELECT * FROM users WHERE googlesub = $1`, [profile.sub]);
  if (bySubResult.rows[0]) {
    return userRowFromPg(bySubResult.rows[0] as Record<string, unknown>);
  }

  const byEmailResult = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const existing = byEmailResult.rows[0]
    ? userRowFromPg(byEmailResult.rows[0] as Record<string, unknown>)
    : null;

  if (existing) {
    if (existing.googleSub && existing.googleSub !== profile.sub) {
      throw Object.assign(new Error("An account already exists for this email"), {
        code: "ACCOUNT_CONFLICT",
      });
    }
    if (!existing.googleSub) {
      await pool.query(`UPDATE users SET googlesub = $1 WHERE id = $2`, [profile.sub, existing.id]);
      const linked = await pool.query(`SELECT * FROM users WHERE id = $1`, [existing.id]);
      return userRowFromPg(linked.rows[0] as Record<string, unknown>);
    }
    return existing;
  }

  const id = randomUUID();
  const ts = new Date().toISOString();
  await pool.query(
    `INSERT INTO users (id, email, displayname, passwordhash, googlesub, role, permissions, createdat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      email,
      displayName,
      null,
      profile.sub,
      "user",
      serializePermissions([]),
      ts,
    ],
  );
  const created = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return userRowFromPg(created.rows[0] as Record<string, unknown>);
}

export function validateRegistration(input: {
  email: string;
  password: string;
  displayName: string;
}): { email: string; password: string; displayName: string } {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!email || !isValidEmail(email)) {
    throw Object.assign(new Error("A valid email address is required"), { code: "VALIDATION" });
  }
  if (email === DEV_USER_LOGIN) {
    throw Object.assign(new Error("That username is reserved"), { code: "VALIDATION" });
  }
  if (!displayName) {
    throw Object.assign(new Error("Display name is required"), { code: "VALIDATION" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw Object.assign(
      new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
      { code: "VALIDATION" },
    );
  }

  return { email, password, displayName };
}

/** @deprecated Password registration removed from public API; retained for tests/internal use. */
export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<UserRow> {
  const validated = validateRegistration(input);
  if (getUserByEmail(validated.email)) {
    throw Object.assign(new Error("An account with this email already exists"), {
      code: "DUPLICATE_EMAIL",
    });
  }

  const passwordHash = await hashPassword(validated.password);
  return createUser({
    email: validated.email,
    displayName: validated.displayName,
    passwordHash,
  });
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserRow | null> {
  const normalized = normalizeEmail(email);
  const user = getUserByEmail(normalized);
  if (!user?.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export function userRowToDto(row: UserRow): UserDto {
  return userToDto(row);
}
