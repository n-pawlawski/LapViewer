import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const deasync = require("deasync") as typeof import("deasync");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../../../infra/postgres/schema.sql");

function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export interface DbRunResult {
  changes: number;
}

export interface DbStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): DbRunResult;
}

export interface DbClient {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
}

function querySync(pool: pg.Pool, text: string, params: unknown[] = []): pg.QueryResult {
  let finished = false;
  let result: pg.QueryResult | undefined;
  let error: Error | undefined;
  void pool.query(text, params).then(
    (res) => {
      result = res;
      finished = true;
    },
    (err: Error) => {
      error = err;
      finished = true;
    },
  );
  deasync.loopWhile(() => !finished);
  if (error) throw error;
  return result!;
}

export class PostgresDbClient implements DbClient {
  readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  prepare(sql: string): DbStatement {
    const text = convertPlaceholders(sql);
    return {
      get: (...params: unknown[]) => querySync(this.pool, text, params).rows[0],
      all: (...params: unknown[]) => querySync(this.pool, text, params).rows,
      run: (...params: unknown[]) => ({
        changes: querySync(this.pool, text, params).rowCount ?? 0,
      }),
    };
  }

  exec(sql: string): void {
    querySync(this.pool, sql);
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    const wrapped = ((...args: Parameters<T>) => {
      querySync(this.pool, "BEGIN");
      try {
        const result = fn(...args);
        querySync(this.pool, "COMMIT");
        return result;
      } catch (err) {
        querySync(this.pool, "ROLLBACK");
        throw err;
      }
    }) as T;
    return wrapped;
  }
}

function poolConfigFor(connectionString: string): pg.PoolConfig {
  const sslRequired = /[?&]sslmode=(?!disable(?:&|$))/i.test(connectionString);
  const normalized = sslRequired
    ? connectionString.replace(/([?&])sslmode=[^&]*/i, "").replace(/\?&/, "?").replace(/[?&]$/, "")
    : connectionString;
  return {
    connectionString: normalized,
    max: 10,
    ...(sslRequired ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export async function createPostgresClient(connectionString: string): Promise<PostgresDbClient> {
  const pool = new pg.Pool(poolConfigFor(connectionString));
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS googleSub TEXT`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(googleSub) WHERE googleSub IS NOT NULL`,
  );
  return new PostgresDbClient(pool);
}

export async function checkPostgresHealth(
  pool: pg.Pool,
): Promise<{ ok: boolean; kind: "postgres"; error?: string }> {
  try {
    await pool.query("SELECT 1 AS ok");
    return { ok: true, kind: "postgres" };
  } catch (err) {
    return {
      ok: false,
      kind: "postgres",
      error: err instanceof Error ? err.message : "Postgres check failed",
    };
  }
}
