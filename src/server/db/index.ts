/**
 * Drizzle client. Uses the `postgres` driver (postgres.js) against DATABASE_URL.
 * Callers should treat this as the single shared connection for the Node process.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at a Postgres instance before using the db client.",
    );
  }

  const client = postgres(url, {
    // Serverless-friendly: don't keep idle sockets forever.
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

/** Lazy singleton so importing the module never opens a connection at build time. */
let _db: Db | undefined;

export function getDb(): Db {
  _db ??= createDb();
  return _db;
}

export { schema };
