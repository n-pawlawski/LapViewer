import { apiFetch, apiFetchOptional } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
}

export interface HealthResponse {
  ok: boolean;
  devUserMode: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function fetchMe(): Promise<AuthUser | null> {
  return apiFetchOptional<AuthUser>("/api/auth/me");
}

export async function register(body: RegisterRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function login(body: LoginRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}
