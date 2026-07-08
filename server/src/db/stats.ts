import { getDb, getDbKind } from "./database.js";

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
  const db = getDb();
  const ts = nowIso();
  const insertSql =
    getDbKind() === "postgres"
      ? `INSERT INTO stat_definitions (key, label, description, kind, scope, createdAt)
         VALUES (?, ?, ?, ?, 'user', ?)
         ON CONFLICT (key) DO NOTHING`
      : `INSERT OR IGNORE INTO stat_definitions (key, label, description, kind, scope, createdAt)
         VALUES (?, ?, ?, ?, 'user', ?)`;
  const insert = db.prepare(insertSql);

  for (const def of DEFAULT_STAT_DEFINITIONS) {
    insert.run(def.key, def.label, def.description, def.kind, ts);
  }
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

export function getCounterValuesForUser(userId: string): Map<string, number> {
  const rows = getDb()
    .prepare(`SELECT statKey, value FROM stat_counters WHERE userId = ?`)
    .all(userId) as Array<{ statKey: string; value: number }>;
  return new Map(rows.map((row) => [row.statKey, row.value]));
}
