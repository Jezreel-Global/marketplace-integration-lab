/**
 * Apply versioned SQL migrations in db/migrations/.
 * Usage: DATABASE_URL=... npm run db:migrate
 *
 * Does not drop or truncate application data.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

neonConfig.webSocketConstructor = ws;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Set it in .env.local or the shell.");
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql files found in ${migrationsDir}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const version = file;
      const existing = await client.query(
        `SELECT 1 FROM schema_migrations WHERE version = $1`,
        [version],
      );
      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`skip  ${version} (already applied)`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply ${version}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (version) VALUES ($1)`,
          [version],
        );
        await client.query("COMMIT");
        console.log(`ok    ${version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  const code =
    error && typeof error === "object" && "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  console.error(
    "Migration failed. Check database access and migration SQL.",
    code ? "(database error " + code + ")" : "",
  );
  process.exit(1);
});
