import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: Database | undefined;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is required before database access can be used");
    this.name = "DatabaseConfigurationError";
  }
}

export function getDatabase(): Database {
  if (database) return database;

  const { DATABASE_URL } = getServerEnvironment();
  if (!DATABASE_URL) throw new DatabaseConfigurationError();

  pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });
  database = drizzle(pool, { schema });

  return database;
}

export async function closeDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}
