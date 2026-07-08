import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import {
  ALL_PERMISSION_KEYS,
  canManagePermissions,
  parsePermissionsJson,
  serializePermissions,
} from "../auth/permissions.js";
import { isDevUserMode } from "../config.js";
import { getDb } from "./database.js";
import type { DbClient } from "./postgresClient.js";

export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
/** Dev-mode login identifier (sign in with password below). */
export const DEV_USER_LOGIN = "root";
export const DEV_USER_PASSWORD = "root";
export const DEV_USER_DISPLAY_NAME = "Root";

/** @deprecated Use DEV_USER_LOGIN */
export const DEV_USER_EMAIL = DEV_USER_LOGIN;

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  googleSub: string | null;
  role: string;
  permissions: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
  canManagePermissions: boolean;
  permissions: string[];
}

export interface UserAdminDto {
  id: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
  permissions: string[];
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function devPasswordHash(): string {
  return bcrypt.hashSync(DEV_USER_PASSWORD, 12);
}

export function userToDto(row: UserRow): UserDto {
  const permissions = parsePermissionsJson(row.permissions);
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isDevAccount: row.id === DEV_USER_ID,
    canManagePermissions: canManagePermissions(row),
    permissions,
  };
}

export function userToAdminDto(row: UserRow): UserAdminDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isDevAccount: row.id === DEV_USER_ID,
    permissions: parsePermissionsJson(row.permissions),
    createdAt: row.createdAt,
  };
}

export function ensureDevUser(db: DbClient = getDb()): string {
  const existing = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(DEV_USER_ID) as UserRow | undefined;

  const devPermissions = serializePermissions([...ALL_PERMISSION_KEYS]);

  if (existing) {
    const passwordOk =
      !!existing.passwordHash &&
      bcrypt.compareSync(DEV_USER_PASSWORD, existing.passwordHash);
    const existingPermissions = parsePermissionsJson(existing.permissions);
    if (isDevUserMode()) {
      if (
        existing.email !== DEV_USER_LOGIN ||
        existing.displayName !== DEV_USER_DISPLAY_NAME ||
        !passwordOk
      ) {
        db.prepare(
          `UPDATE users SET email = ?, displayName = ?, passwordHash = ? WHERE id = ?`,
        ).run(DEV_USER_LOGIN, DEV_USER_DISPLAY_NAME, devPasswordHash(), DEV_USER_ID);
      }
      if (existingPermissions.length === 0) {
        db.prepare(`UPDATE users SET permissions = ? WHERE id = ?`).run(devPermissions, DEV_USER_ID);
      }
    }
    return DEV_USER_ID;
  }

  const ts = nowIso();
  db.prepare(
    `INSERT INTO users (id, email, displayName, passwordHash, role, permissions, createdAt)
     VALUES (@id, @email, @displayName, @passwordHash, 'user', @permissions, @createdAt)`,
  ).run({
    id: DEV_USER_ID,
    email: DEV_USER_LOGIN,
    displayName: DEV_USER_DISPLAY_NAME,
    passwordHash: devPasswordHash(),
    permissions: devPermissions,
    createdAt: ts,
  });
  return DEV_USER_ID;
}

export function getUserById(id: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
  return row ?? null;
}

export function getUserByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email) as UserRow | undefined;
  return row ?? null;
}

export function getUserByGoogleSub(googleSub: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE googleSub = ?`)
    .get(googleSub) as UserRow | undefined;
  return row ?? null;
}

export function linkGoogleSub(userId: string, googleSub: string): void {
  getDb()
    .prepare(`UPDATE users SET googleSub = ? WHERE id = ?`)
    .run(googleSub, userId);
}

export function listUsers(): UserRow[] {
  return getDb()
    .prepare(`SELECT * FROM users ORDER BY displayName COLLATE NOCASE, email`)
    .all() as UserRow[];
}

export function updateUserDisplayName(userId: string, displayName: string): UserRow | null {
  const trimmed = displayName.trim();
  if (!trimmed) return null;
  getDb().prepare(`UPDATE users SET displayName = ? WHERE id = ?`).run(trimmed, userId);
  return getUserById(userId);
}

export function updateUserPermissions(userId: string, permissions: string[]): UserRow | null {
  getDb()
    .prepare(`UPDATE users SET permissions = ? WHERE id = ?`)
    .run(serializePermissions(permissions), userId);
  return getUserById(userId);
}

export function createUser(input: {
  email: string;
  displayName: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  role?: string;
  permissions?: string[];
}): UserRow {
  const id = randomUUID();
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, displayName, passwordHash, googleSub, role, permissions, createdAt)
       VALUES (@id, @email, @displayName, @passwordHash, @googleSub, @role, @permissions, @createdAt)`,
    )
    .run({
      id,
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash ?? null,
      googleSub: input.googleSub ?? null,
      role: input.role ?? "user",
      permissions: serializePermissions(input.permissions ?? []),
      createdAt: ts,
    });
  return getUserById(id)!;
}
