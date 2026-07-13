import { getDb, getDbKind, getPgPool } from "./database.js";

export type StatKind = "counter" | "computed";
export type StatScope = "user";

export interface StatDefinitionRow {
  key: string;
  label: string;
  description: string;
  kind: StatKind;
  scope: StatScope;
  createdAt: string;
}

export interface StatCounterRow {
  userId: string;
  statKey: string;
  value: number;
  updatedAt: string;
}

const DEFAULT_STAT_DEFINITIONS: Array<{
  key: string;
  label: string;
  description: string;
  kind: StatKind;
}> = [
  {
    key: "auth.login_count",
    label: "Logins",
    description: "Incremented on each successful sign-in (dev login or Google OAuth).",
    kind: "counter",
  },
  {
    key: "sessions.count",
    label: "Sessions",
    description: "Computed: COUNT(*) FROM sessions WHERE userId = ?",
    kind: "computed",
  },
  {
    key: "tracks.count",
    label: "Tracks",
    description: "Computed: COUNT(*) FROM tracks WHERE userId = ?",
    kind: "computed",
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

export function ensureStatDefinitions(): void {
  if (getDbKind() === "postgres") {
    throw new Error("Use ensureStatDefinitionsAsync() for Postgres (deasync deadlocks after top-level await).");
  }
  const db = getDb();
  const ts = nowIso();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO stat_definitions (key, label, description, kind, scope, createdAt)
     VALUES (?, ?, ?, ?, 'user', ?)`,
  );

  for (const def of DEFAULT_STAT_DEFINITIONS) {
    insert.run(def.key, def.label, def.description, def.kind, ts);
  }
}

export async function ensureStatDefinitionsAsync(): Promise<void> {
  if (getDbKind() === "postgres") {
    const pool = getPgPool();
    if (!pool) {
      throw new Error("Postgres pool not initialized. Call initDatabase() first.");
    }
    const ts = nowIso();
    for (const def of DEFAULT_STAT_DEFINITIONS) {
      await pool.query(
        `INSERT INTO stat_definitions (key, label, description, kind, scope, createdat)
         VALUES ($1, $2, $3, $4, 'user', $5)
         ON CONFLICT (key) DO NOTHING`,
        [def.key, def.label, def.description, def.kind, ts],
      );
    }
    return;
  }
  ensureStatDefinitions();
}

export function listStatDefinitions(): StatDefinitionRow[] {
  return getDb()
    .prepare(`SELECT * FROM stat_definitions ORDER BY key`)
    .all() as StatDefinitionRow[];
}

export function getStatDefinition(key: string): StatDefinitionRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM stat_definitions WHERE key = ?`)
    .get(key) as StatDefinitionRow | undefined;
  return row ?? null;
}

export function getStatCounter(userId: string, statKey: string): StatCounterRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM stat_counters WHERE userId = ? AND statKey = ?`)
    .get(userId, statKey) as StatCounterRow | undefined;
  return row ?? null;
}

export function incrementStatCounter(userId: string, statKey: string): void {
  if (getDbKind() === "postgres") {
    throw new Error("Use incrementStatCounterAsync() for Postgres (deasync deadlocks after top-level await).");
  }
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO stat_counters (userId, statKey, value, updatedAt)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(userId, statKey) DO UPDATE SET
         value = value + 1,
         updatedAt = excluded.updatedAt`,
    )
    .run(userId, statKey, ts);
}

export async function incrementStatCounterAsync(userId: string, statKey: string): Promise<void> {
  if (getDbKind() === "postgres") {
    const pool = getPgPool();
    if (!pool) {
      throw new Error("Postgres pool not initialized. Call initDatabase() first.");
    }
    const ts = nowIso();
    await pool.query(
      `INSERT INTO stat_counters (userid, statkey, value, updatedat)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (userid, statkey) DO UPDATE SET
         value = stat_counters.value + 1,
         updatedat = EXCLUDED.updatedat`,
      [userId, statKey, ts],
    );
    return;
  }
  incrementStatCounter(userId, statKey);
}

export function getCounterValuesForUser(userId: string): Map<string, number> {
  const rows = getDb()
    .prepare(`SELECT statKey, value FROM stat_counters WHERE userId = ?`)
    .all(userId) as Array<{ statKey: string; value: number }>;
  return new Map(rows.map((row) => [row.statKey, row.value]));
}
