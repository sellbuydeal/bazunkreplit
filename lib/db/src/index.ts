import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isLocalDatabase = /(?:localhost|127\\.0\\.0\\.1)/i.test(databaseUrl);

// Hosted PostgreSQL providers (including Render external database URLs) require TLS.
// Keep local development non-TLS, while allowing production DATABASE_URL connections
// to negotiate SSL without requiring a locally installed CA certificate.
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
