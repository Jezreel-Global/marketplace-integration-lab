/**
 * Explicit demo-data reset for runtime tables only.
 * Requires explicit confirmation, a non-production assertion, and an exact
 * target database name before it opens a connection.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { loadEnvConfig } from "@next/env";
import { demoResetSafetyError } from "@/lib/store/reset-safety";

loadEnvConfig(process.cwd());

neonConfig.webSocketConstructor = ws;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const safetyError = demoResetSafetyError({
    databaseUrl,
    confirm: process.env.DEMO_RESET_CONFIRM,
    nonProduction: process.env.DEMO_RESET_NON_PRODUCTION,
    targetDatabase: process.env.DEMO_RESET_DATABASE,
  });
  if (safetyError) {
    console.error("Refusing to reset: " + safetyError);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE runtime_payment_attempts, runtime_bookings");
    await client.query("COMMIT");
    console.log(
      "Truncated runtime_bookings and runtime_payment_attempts. Seed catalog (in code) is unchanged.",
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
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
    "Reset failed. Check the target database and runtime table schema.",
    code ? "(database error " + code + ")" : "",
  );
  process.exit(1);
});
