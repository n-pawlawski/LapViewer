import { apiFetch } from "./client";

export interface UserStatValue {
  key: string;
  label: string;
  kind: "counter" | "computed";
  value: number;
}

export interface UserStatsBundle {
  userId: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
  stats: UserStatValue[];
}

export async function fetchMyStats(): Promise<UserStatValue[]> {
  const response = await apiFetch<{ stats: UserStatValue[] }>("/api/stats/me");
  return response.stats;
}

export async function fetchAllUsersStats(): Promise<UserStatsBundle[]> {
  const response = await apiFetch<{ users: UserStatsBundle[] }>("/api/stats");
  return response.users;
}
