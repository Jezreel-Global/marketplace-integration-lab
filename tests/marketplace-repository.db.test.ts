/**
 * Integration tests against a real Neon/Postgres DATABASE_URL.
 * Skipped (not failed) when DATABASE_URL is unset — do not treat skip as pass.
 */
import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { calculatePlatformFee } from "../src/lib/fees";
import {
  cancelRuntimeBooking,
  createBooking,
  getBookingById,
  listAllBookings,
  listPaymentAttemptsForBooking,
  simulatePayment,
} from "../src/lib/marketplace-repository";
import { closePoolForTests, getPool } from "../src/lib/store/db";
import { setMarketplaceStoreForTests } from "../src/lib/store";
import { databaseTestSafetyError } from "../src/lib/store/database-test-safety";

loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseSafetyError = databaseTestSafetyError(
  databaseUrl,
  process.env.DATABASE_TEST_NON_PRODUCTION,
  process.env.DATABASE_TEST_DATABASE,
);
const hasDatabase = !databaseSafetyError;

describe("marketplace repository (postgres)", { skip: !hasDatabase }, () => {
  before(async () => {
    setMarketplaceStoreForTests(undefined);
    // Ensure singleton re-reads env
    await closePoolForTests();
  });

  after(async () => {
    await closePoolForTests();
  });

  it("creates, fails, pays, and reloads after pool recycle (process restart)", async () => {
    const fees = calculatePlatformFee(4_000_000);
    const created = await createBooking({
      listingId: "list_maths_intensive",
      customerName: "DB Integration",
      customerEmail: "db-int@example.com",
      scheduledFor: "2026-11-10T15:00:00Z",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.data.booking.platformFeeKobo, fees.platformFeeKobo);

    const id = created.data.booking.id;
    const fail = await simulatePayment(id, "failure");
    assert.equal(fail.ok, true);

    const ok = await simulatePayment(id, "success");
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(ok.data.booking.status, "paid");

    await closePoolForTests();
    setMarketplaceStoreForTests(undefined);

    const reloaded = await getBookingById(id);
    assert.equal(reloaded?.status, "paid");
    assert.equal(reloaded?.paymentMode, "simulated");

    const merged = await listAllBookings();
    assert.ok(merged.some((b) => b.id === id));
    assert.ok(merged.some((b) => b.id === "book_pending_demo"));
    const attempts = await listPaymentAttemptsForBooking(id);
    assert.deepEqual(
      attempts.map((attempt) => attempt.status),
      ["failed", "succeeded"],
    );

    const child = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        "import { getBookingById } from './src/lib/marketplace-repository.ts'; const booking = await getBookingById(process.env.MARKETPLACE_TEST_BOOKING_ID); console.log(booking?.status ?? 'missing');",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MARKETPLACE_TEST_BOOKING_ID: id,
        },
        encoding: "utf8",
      },
    );
    assert.equal(child.status, 0, "fresh Node process could not read booking");
    assert.equal(child.stdout.trim(), "paid");
  });

  it("supports concurrent inserts without lost rows", async () => {
    const stamp = Date.now();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        createBooking({
          listingId: "list_portrait_halfday",
          customerName: `DB Conc ${stamp}-${i}`,
          customerEmail: `dbconc${stamp}${i}@example.com`,
          scheduledFor: "2026-12-15T10:00:00Z",
        }),
      ),
    );
    assert.equal(results.filter((r) => r.ok).length, 6);
    const ids = results
      .filter((r) => r.ok)
      .map((r) => (r.ok ? r.data.booking.id : ""));
    const bookings = await listAllBookings();
    for (const id of ids) {
      assert.ok(bookings.some((b) => b.id === id));
    }
  });

  it("rejects values outside the persisted domain-state constraints", async () => {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "Constraint Test",
      customerEmail: "constraint@example.com",
      scheduledFor: "2026-11-12T08:00:00Z",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    await assert.rejects(
      getPool().query(
        "UPDATE runtime_bookings SET status = $1 WHERE id = $2",
        ["not_a_status", created.data.booking.id],
      ),
    );
  });

  it("enforces cancel rules against the database", async () => {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "DB Cancel",
      customerEmail: "db-cancel@example.com",
      scheduledFor: "2026-11-11T08:00:00Z",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const id = created.data.booking.id;
    const cancelled = await cancelRuntimeBooking(id);
    assert.equal(cancelled.ok, true);
    const pay = await simulatePayment(id, "success");
    assert.equal(pay.ok, false);
  });
});

if (!hasDatabase) {
  console.log("[test:db] SKIPPED — " + databaseSafetyError);
}
