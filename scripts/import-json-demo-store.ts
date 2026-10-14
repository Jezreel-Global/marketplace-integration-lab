/**
 * Optional, explicitly invoked import of a local JSON demo store into Postgres.
 * Not used by the web app request path.
 *
 * Usage:
 *   DATABASE_URL=... npm run db:import-json -- data/demo-store.json
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

neonConfig.webSocketConstructor = ws;

type JsonBooking = Record<string, unknown>;
type JsonAttempt = Record<string, unknown>;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const fileArg = process.argv[2] ?? "data/demo-store.json";
  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as {
    version?: number;
    bookings?: JsonBooking[];
    paymentAttempts?: JsonAttempt[];
  };

  if (parsed.version !== 1 || !Array.isArray(parsed.bookings)) {
    console.error("Expected demo-store.json with version: 1 and bookings[].");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const b of parsed.bookings) {
      await client.query(
        `INSERT INTO runtime_bookings (
          id, listing_id, provider_id, customer_name, customer_email,
          scheduled_for, amount_kobo, currency, platform_fee_kobo, provider_share_kobo,
          status, payment_mode, payment_attempt_status, data_source, created_at, status_note
        ) VALUES (
          $1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9,$10,$11,$12,$13,$14,$15::timestamptz,$16
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          b.id,
          b.listingId,
          b.providerId,
          b.customerName,
          b.customerEmail,
          b.scheduledFor,
          b.amountKobo,
          b.currency ?? "NGN",
          b.platformFeeKobo,
          b.providerShareKobo,
          b.status,
          b.paymentMode,
          b.paymentAttemptStatus,
          b.dataSource ?? "mock",
          b.createdAt,
          b.statusNote,
        ],
      );
    }

    for (const a of parsed.paymentAttempts ?? []) {
      await client.query(
        `INSERT INTO runtime_payment_attempts (
          id, booking_id, provider, mode, status,
          amount_kobo, currency, data_source, note, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
          a.bookingId,
          a.provider,
          a.mode,
          a.status,
          a.amountKobo,
          a.currency ?? "NGN",
          a.dataSource ?? "mock",
          a.note,
          a.createdAt,
        ],
      );
    }
    await client.query("COMMIT");
    console.log(
      `Imported from ${filePath} (duplicates skipped). JSON file was not deleted.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
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
    "Import failed. Check the JSON file, database access, and runtime schema.",
    code ? "(database error " + code + ")" : "",
  );
  process.exit(1);
});
