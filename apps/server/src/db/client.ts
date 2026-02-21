import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://tenos:tenos@localhost:5433/tenos";

const sql = postgres(connectionString, { max: 10 });

export const db = drizzle(sql, { schema });

/** Verify database is reachable. Throws if connection fails. */
export async function ensureDbConnection(): Promise<void> {
	await sql`SELECT 1`;
	console.log("[DB] Connection verified");
}

/** Drain the connection pool for graceful shutdown. */
export async function closeDb(): Promise<void> {
	await sql.end();
	console.log("[DB] Connection pool closed");
}
