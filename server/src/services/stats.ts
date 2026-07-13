import { getDb } from "../db/database.js";
import { getDbKind } from "../db/database.js";
import {
  ensureStatDefinitions,
  ensureStatDefinitionsAsync,
  getStatDefinition,
  getCounterValuesForUser,
  incrementStatCounter,
  incrementStatCounterAsync,
  listStatDefinitions,
  type StatDefinitionRow,
} from "../db/stats.js";
import { listUsers, DEV_USER_ID } from "../db/users.js";

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

function resolveComputedStat(userId: string, statKey: string): number {
  switch (statKey) {
    case "sessions.count": {
      const row = getDb()
        .prepare(`SELECT COUNT(*) as c FROM sessions WHERE userId = ?`)
        .get(userId) as { c: number };
      return row.c;
    }
    case "tracks.count": {
      const row = getDb()
        .prepare(`SELECT COUNT(*) as c FROM tracks WHERE userId = ?`)
        .get(userId) as { c: number };
      return row.c;
    }
    default:
      return 0;
  }
}

function buildStatsForUser(
  userId: string,
  definitions: StatDefinitionRow[],
  counters: Map<string, number>,
): UserStatValue[] {
  return definitions.map((def) => {
    if (def.kind === "counter") {
      return {
        key: def.key,
        label: def.label,
        kind: def.kind,
        value: counters.get(def.key) ?? 0,
      };
    }
    return {
      key: def.key,
      label: def.label,
      kind: def.kind,
      value: resolveComputedStat(userId, def.key),
    };
  });
}

export function initializeStatsCatalog(): void {
  ensureStatDefinitions();
}

export async function initializeStatsCatalogAsync(): Promise<void> {
  await ensureStatDefinitionsAsync();
}

export function incrementUserStat(userId: string, statKey: string): void {
  const def = getStatDefinition(statKey);
  if (!def) {
    throw Object.assign(new Error(`Unknown stat key: ${statKey}`), { code: "UNKNOWN_STAT" });
  }
  if (def.kind !== "counter") {
    throw Object.assign(new Error(`Stat ${statKey} is not a counter`), { code: "NOT_COUNTER" });
  }
  incrementStatCounter(userId, statKey);
}

export function getUserStats(userId: string): UserStatValue[] {
  const definitions = listStatDefinitions();
  const counters = getCounterValuesForUser(userId);
  return buildStatsForUser(userId, definitions, counters);
}

export function getAllUsersStats(): UserStatsBundle[] {
  const definitions = listStatDefinitions();
  const users = listUsers();

  return users.map((user) => {
    const counters = getCounterValuesForUser(user.id);
    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isDevAccount: user.id === DEV_USER_ID,
      stats: buildStatsForUser(user.id, definitions, counters),
    };
  });
}

export function recordUserLogin(userId: string): void {
  incrementUserStat(userId, "auth.login_count");
}

export async function recordUserLoginAsync(userId: string): Promise<void> {
  if (getDbKind() === "postgres") {
    await incrementStatCounterAsync(userId, "auth.login_count");
    return;
  }
  recordUserLogin(userId);
}
