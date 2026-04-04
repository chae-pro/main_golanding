import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import { Pool } from "pg";

import type {
  AnalyticsEvent,
  ApprovedAccount,
  CreatorSession,
  FormSubmissionRecord,
  Landing,
  VisitorSession,
} from "@/domain/types";

const DB_PATH = path.join(process.cwd(), "data", "golanding.sqlite");
const SQLITE_MIGRATION_PATH = path.join(
  process.cwd(),
  "infra",
  "migrations",
  "0001_sqlite_init.sql",
);
const POSTGRES_MIGRATION_PATH = path.join(
  process.cwd(),
  "infra",
  "migrations",
  "0002_postgres_init.sql",
);

export type DbProvider = "sqlite" | "postgres";
type DbValue = string | number | null;
type RunResult = { changes: number };

export type DbExecutor = {
  provider: DbProvider;
  exec: (sql: string) => Promise<void>;
  one: <T>(sql: string, params?: DbValue[]) => Promise<T | undefined>;
  many: <T>(sql: string, params?: DbValue[]) => Promise<T[]>;
  run: (sql: string, params?: DbValue[]) => Promise<RunResult>;
};

export type DbClient = DbExecutor & {
  transaction: <T>(callback: (tx: DbExecutor) => Promise<T>) => Promise<T>;
};

type DbGlobal = typeof globalThis & {
  __golandingDbClient?: DbClient;
  __golandingDbInitPromise?: Promise<DbClient>;
  __golandingSqliteDb?: DatabaseSync;
  __golandingPgPool?: Pool;
};

const DEFAULT_VIEWPORT_BOTTOM_RATIO = 0.05;

function getDbProvider(): DbProvider {
  const explicit = process.env.GOLANDING_DB_PROVIDER?.trim().toLowerCase();

  if (explicit === "postgres") {
    return "postgres";
  }

  if (explicit === "sqlite") {
    return "sqlite";
  }

  return process.env.DATABASE_URL ? "postgres" : "sqlite";
}

function parseJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function toPostgresSql(sql: string) {
  let placeholderIndex = 0;
  return sql.replace(/\?/g, () => `$${placeholderIndex += 1}`);
}

function getPgPool() {
  const globalDb = globalThis as DbGlobal;

  if (!globalDb.__golandingPgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required when GOLANDING_DB_PROVIDER=postgres");
    }

    globalDb.__golandingPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.GOLANDING_DB_SSL === "require"
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    });
  }

  return globalDb.__golandingPgPool;
}

async function getSqliteDatabase() {
  const globalDb = globalThis as DbGlobal;

  if (!globalDb.__golandingSqliteDb) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const sqliteModule = await import("node:sqlite");
    globalDb.__golandingSqliteDb = new sqliteModule.DatabaseSync(DB_PATH);
  }

  return globalDb.__golandingSqliteDb;
}

function createSqliteExecutor(db: DatabaseSync): DbClient {
  const executor: DbClient = {
    provider: "sqlite",
    async exec(sql) {
      db.exec(sql);
    },
    one: (async (sql: string, params: DbValue[] = []) => {
      return db.prepare(sql).get(...params);
    }) as DbClient["one"],
    many: (async (sql: string, params: DbValue[] = []) => {
      return db.prepare(sql).all(...params);
    }) as DbClient["many"],
    async run(sql: string, params: DbValue[] = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    transaction: (async <T>(callback: (tx: DbExecutor) => Promise<T>) => {
      db.exec("BEGIN");
      try {
        const result = await callback(executor);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }) as DbClient["transaction"],
  };

  return executor;
}

function createPostgresTransactionExecutor(client: {
  query: (sql: string, params?: DbValue[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
}): DbExecutor {
  return {
    provider: "postgres",
    async exec(sql) {
      await client.query(sql);
    },
    one: (async (sql: string, params: DbValue[] = []) => {
      const result = await client.query(toPostgresSql(sql), params);
      return result.rows[0];
    }) as DbExecutor["one"],
    many: (async (sql: string, params: DbValue[] = []) => {
      const result = await client.query(toPostgresSql(sql), params);
      return result.rows;
    }) as DbExecutor["many"],
    async run(sql: string, params: DbValue[] = []) {
      const result = await client.query(toPostgresSql(sql), params);
      return { changes: result.rowCount ?? 0 };
    },
  };
}

function createPostgresClient(pool: Pool): DbClient {
  const executor: DbClient = {
    provider: "postgres",
    async exec(sql) {
      await pool.query(sql);
    },
    one: (async (sql: string, params: DbValue[] = []) => {
      const result = await pool.query(toPostgresSql(sql), params);
      return result.rows[0];
    }) as DbClient["one"],
    many: (async (sql: string, params: DbValue[] = []) => {
      const result = await pool.query(toPostgresSql(sql), params);
      return result.rows;
    }) as DbClient["many"],
    async run(sql: string, params: DbValue[] = []) {
      const result = await pool.query(toPostgresSql(sql), params);
      return { changes: result.rowCount ?? 0 };
    },
    transaction: (async <T>(callback: (tx: DbExecutor) => Promise<T>) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await callback(createPostgresTransactionExecutor(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }) as DbClient["transaction"],
  };

  return executor;
}

async function execIgnoreAlreadyExists(db: DbClient, sql: string) {
  try {
    await db.exec(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (
      message.includes("duplicate column name") ||
      message.includes("already exists") ||
      message.includes("duplicate_column")
    ) {
      return;
    }

    throw error;
  }
}

async function ensureVisitorSessionViewportColumns(db: DbClient) {
  if (db.provider === "postgres") {
    return;
  }

  await execIgnoreAlreadyExists(
    db,
    "ALTER TABLE visitor_sessions ADD COLUMN last_viewport_top_ratio REAL NOT NULL DEFAULT 0",
  );
  await execIgnoreAlreadyExists(
    db,
    `ALTER TABLE visitor_sessions ADD COLUMN last_viewport_bottom_ratio REAL NOT NULL DEFAULT ${DEFAULT_VIEWPORT_BOTTOM_RATIO}`,
  );
  await execIgnoreAlreadyExists(
    db,
    "ALTER TABLE visitor_sessions ADD COLUMN max_visible_section_index INTEGER NOT NULL DEFAULT 1",
  );
}

async function seedApprovedAccounts(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "approved-users.json");
  const seed = parseJsonFile<ApprovedAccount[]>(seedPath, []);

  for (const account of seed) {
    await db.run(
      `
      INSERT INTO approved_accounts (
        id, email, name, cohort, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        account.id,
        account.email,
        account.name,
        account.cohort ?? null,
        account.status,
        account.expiresAt,
        account.createdAt,
        account.updatedAt,
      ],
    );
  }
}

async function seedCreatorSessions(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "sessions.json");
  const seed = parseJsonFile<CreatorSession[]>(seedPath, []);

  for (const session of seed) {
    await db.run(
      `
      INSERT INTO creator_sessions (
        id, approved_account_id, email, token_version, expires_at, status,
        last_validated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        session.id,
        session.approvedAccountId,
        session.email,
        session.tokenVersion,
        session.expiresAt,
        session.status,
        session.lastValidatedAt,
        session.createdAt,
        session.updatedAt,
      ],
    );
  }
}

async function seedLandings(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "landings.json");
  const seed = parseJsonFile<Landing[]>(seedPath, []);

  for (const landing of seed) {
    await db.run(
      `
      INSERT INTO landings (
        id, owner_email, type, title, public_slug, status, description,
        primary_color, text_color, surface_color, radius, html_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        landing.id,
        landing.ownerEmail,
        landing.type,
        landing.title,
        landing.publicSlug,
        landing.status,
        landing.description ?? null,
        landing.theme.primaryColor,
        landing.theme.textColor,
        landing.theme.surfaceColor,
        landing.theme.radius,
        landing.htmlSource?.htmlSource ?? null,
        landing.createdAt,
        landing.updatedAt,
      ],
    );

    for (const image of landing.images) {
      await db.run(
        `
        INSERT INTO landing_images (id, landing_id, sort_order, src, alt)
        VALUES (?, ?, ?, ?, ?)
      `,
        [image.id, landing.id, image.sortOrder, image.src, image.alt ?? null],
      );
    }

    for (const button of landing.buttons) {
      await db.run(
        `
        INSERT INTO landing_buttons (id, landing_id, label, href, width_ratio, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          button.id,
          landing.id,
          button.label,
          button.href,
          button.widthRatio,
          button.sortOrder,
        ],
      );
    }

    for (const field of landing.formFields) {
      await db.run(
        `
        INSERT INTO landing_form_fields (
          id, landing_id, field_key, label, placeholder, required, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          field.id,
          landing.id,
          field.fieldKey,
          field.label,
          field.placeholder ?? null,
          field.required ? 1 : 0,
          field.sortOrder,
        ],
      );
    }
  }
}

async function seedVisitorSessions(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "visitor-sessions.json");
  const seed = parseJsonFile<VisitorSession[]>(seedPath, []);

  for (const session of seed) {
    await db.run(
      `
      INSERT INTO visitor_sessions (
        id, landing_id, started_at, last_activity_at, last_section_index,
        last_viewport_top_ratio, last_viewport_bottom_ratio, max_visible_section_index,
        max_scroll_depth, excluded_from_dwell, valid_dwell_ms, section_dwell_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        session.id,
        session.landingId,
        session.startedAt,
        session.lastActivityAt,
        session.lastSectionIndex,
        session.lastViewportTopRatio ?? 0,
        session.lastViewportBottomRatio ?? DEFAULT_VIEWPORT_BOTTOM_RATIO,
        session.maxVisibleSectionIndex ?? Math.max(session.lastSectionIndex, 1),
        session.maxScrollDepth,
        session.excludedFromDwell ? 1 : 0,
        session.validDwellMs,
        JSON.stringify(session.sectionDwellMs),
      ],
    );
  }
}

async function seedAnalyticsEvents(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "analytics-events.json");
  const seed = parseJsonFile<AnalyticsEvent[]>(seedPath, []);

  for (const event of seed) {
    await db.run(
      `
      INSERT INTO analytics_events (
        id, landing_id, session_id, event_type, section_index, scroll_depth,
        x_ratio, y_ratio, target_type, target_id, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        event.id,
        event.landingId,
        event.sessionId,
        event.eventType,
        event.sectionIndex,
        event.scrollDepth ?? null,
        event.xRatio ?? null,
        event.yRatio ?? null,
        event.targetType ?? null,
        event.targetId ?? null,
        event.occurredAt,
      ],
    );
  }
}

async function seedFormSubmissions(db: DbExecutor) {
  const seedPath = path.join(process.cwd(), "data", "form-submissions.json");
  const seed = parseJsonFile<FormSubmissionRecord[]>(seedPath, []);

  for (const submission of seed) {
    await db.run(
      `
      INSERT INTO form_submissions (id, landing_id, session_id, submitted_at, values_json)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        submission.id,
        submission.landingId,
        submission.sessionId,
        submission.submittedAt,
        JSON.stringify(submission.values),
      ],
    );
  }
}

async function seedDatabase(db: DbClient) {
  const countRow = await db.one<{ count: number | string }>(
    "SELECT COUNT(*) AS count FROM approved_accounts",
  );

  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    await seedApprovedAccounts(tx);
    await seedCreatorSessions(tx);
    await seedLandings(tx);
    await seedVisitorSessions(tx);
    await seedAnalyticsEvents(tx);
    await seedFormSubmissions(tx);
  });
}

async function initializeSqliteClient() {
  const db = await getSqliteDatabase();
  const client = createSqliteExecutor(db);
  await client.exec(readFileSync(SQLITE_MIGRATION_PATH, "utf8"));
  await ensureVisitorSessionViewportColumns(client);
  await seedDatabase(client);
  return client;
}

async function initializePostgresClient() {
  const client = createPostgresClient(getPgPool());
  await client.exec(readFileSync(POSTGRES_MIGRATION_PATH, "utf8"));
  await seedDatabase(client);
  return client;
}

export async function getDb() {
  const globalDb = globalThis as DbGlobal;

  if (globalDb.__golandingDbClient) {
    return globalDb.__golandingDbClient;
  }

  if (!globalDb.__golandingDbInitPromise) {
    globalDb.__golandingDbInitPromise =
      getDbProvider() === "postgres" ? initializePostgresClient() : initializeSqliteClient();
  }

  globalDb.__golandingDbClient = await globalDb.__golandingDbInitPromise;
  return globalDb.__golandingDbClient;
}

export async function resetDbSingletonForTests() {
  const globalDb = globalThis as DbGlobal;
  globalDb.__golandingSqliteDb?.close();
  globalDb.__golandingSqliteDb = undefined;

  if (globalDb.__golandingPgPool) {
    await globalDb.__golandingPgPool.end();
    globalDb.__golandingPgPool = undefined;
  }

  globalDb.__golandingDbClient = undefined;
  globalDb.__golandingDbInitPromise = undefined;
}

export function dbFileExists() {
  return existsSync(DB_PATH);
}

export function getCurrentDbProvider() {
  return getDbProvider();
}
