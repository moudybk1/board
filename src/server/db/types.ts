/**
 * Database handle types shared by services and repositories.
 *
 * Most domain functions work equally well against the pooled client or inside
 * a transaction, so they take `DbOrTx` and let the caller decide.
 */
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type { Db } from "@/server/db";
import type * as schema from "@/server/db/schema";

/** A transaction handle as produced by `db.transaction(...)`. */
export type DbTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** Either the shared client or an open transaction. */
export type DbOrTx = Db | DbTx;
