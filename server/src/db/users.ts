import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type Database from "better-sqlite3";
import { isDevUserMode } from "../config.js";
import { getDb } from "./database.js";

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
  role: string;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function devPasswordHash(): string {
  return bcrypt.hashSync(DEV_USER_PASSWORD, 12);
}

export function userToDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isDevAccount: row.id === DEV_USER_ID,
  };
}

export function ensureDevUser(db: Database.Database = getDb()): string {
  const existing = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(DEV_USER_ID) as UserRow | undefined;

  if (existing) {
    const passwordOk =
      !!existing.passwordHash &&
      bcrypt.compareSync(DEV_USER_PASSWORD, existing.passwordHash);
    if (
      isDevUserMode() &&
      (existing.email !== DEV_USER_LOGIN ||
        existing.displayName !== DEV_USER_DISPLAY_NAME ||
        !passwordOk)
    ) {
      db.prepare(
        `UPDATE users SET email = ?, displayName = ?, passwordHash = ? WHERE id = ?`,
      ).run(DEV_USER_LOGIN, DEV_USER_DISPLAY_NAME, devPasswordHash(), DEV_USER_ID);
    }
    return DEV_USER_ID;
  }

  const ts = nowIso();
  db.prepare(
    `INSERT INTO users (id, email, displayName, passwordHash, role, createdAt)
     VALUES (@id, @email, @displayName, @passwordHash, 'user', @createdAt)`,
  ).run({
    id: DEV_USER_ID,
    email: DEV_USER_LOGIN,
    displayName: DEV_USER_DISPLAY_NAME,
    passwordHash: devPasswordHash(),
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

export function createUser(input: {
  email: string;
  displayName: string;
  passwordHash?: string | null;
  role?: string;
}): UserRow {
  const id = randomUUID();
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, displayName, passwordHash, role, createdAt)
       VALUES (@id, @email, @displayName, @passwordHash, @role, @createdAt)`,
    )
    .run({
      id,
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash ?? null,
      role: input.role ?? "user",
      createdAt: ts,
    });
  return getUserById(id)!;
}
