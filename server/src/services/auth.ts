import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  createUser,
  DEV_USER_LOGIN,
  getUserByEmail,
  getUserById,
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

export function getAuthenticatedUserDto(userId: string): UserDto | null {
  const user = getUserById(userId);
  return user ? userToDto(user) : null;
}
