import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { bookings as seedBookings } from "../src/data/seed";
import { calculatePlatformFee } from "../src/lib/fees";
import { demoResetSafetyError } from "../src/lib/store/reset-safety";
import { databaseTestSafetyError } from "../src/lib/store/database-test-safety";
import {
  cancelRuntimeBooking,
  createBooking,
  getBookingById,
  listAllBookings,
  listAllPaymentAttempts,
  listBookingsForProvider,
  simulatePayment,
} from "../src/lib/marketplace-repository";
import {
  createMemoryStore,
  setMarketplaceStoreForTests,
} from "../src/lib/store";

describe("marketplace repository (memory store)", () => {
  beforeEach(() => {
    setMarketplaceStoreForTests(createMemoryStore());
  });

  afterEach(() => {
    setMarketplaceStoreForTests(undefined);
  });

  it("creates a valid booking with server-side fees", async () => {
    const listingId = "list_portrait_halfday";
    const expected = calculatePlatformFee(7_500_000);
    const result = await createBooking({
      listingId,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      scheduledFor: "2026-11-01T10:00",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.booking.status, "pending_payment");
    assert.equal(result.data.booking.paymentMode, "simulated");
    assert.equal(result.data.booking.dataSource, "mock");
    assert.equal(result.data.booking.amountKobo, expected.amountKobo);
    assert.equal(result.data.booking.platformFeeKobo, expected.platformFeeKobo);
    assert.equal(
      result.data.booking.providerShareKobo,
      expected.providerShareKobo,
    );
  });

  it("rejects invalid listing ids and invalid input", async () => {
    const unknown = await createBooking({
      listingId: "nope",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      scheduledFor: "2026-11-01T10:00",
    });
    assert.equal(unknown.ok, false);

    const badEmail = await createBooking({
      listingId: "list_portrait_halfday",
      customerName: "Ada Lovelace",
      customerEmail: "not-an-email",
      scheduledFor: "2026-11-01T10:00",
    });
    assert.equal(badEmail.ok, false);

    const shortName = await createBooking({
      listingId: "list_portrait_halfday",
      customerName: "A",
      customerEmail: "ada@example.com",
      scheduledFor: "2026-11-01T10:00",
    });
    assert.equal(shortName.ok, false);
  });

  it("rejects malformed runtime action arguments", async () => {
    const missingInput = await createBooking(null as never);
    assert.equal(missingInput.ok, false);

    const invalidField = await createBooking({
      listingId: "list_portrait_halfday",
      customerName: 7,
      customerEmail: "ada@example.com",
      scheduledFor: "2026-11-01T10:00",
    } as never);
    assert.equal(invalidField.ok, false);

    const invalidOutcome = await simulatePayment("book_unknown", "refund" as never);
    assert.equal(invalidOutcome.ok, false);

    const invalidBookingId = await cancelRuntimeBooking(42 as never);
    assert.equal(invalidBookingId.ok, false);
  });

  it("simulates payment failure then success", async () => {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "Test User",
      customerEmail: "test@example.com",
      scheduledFor: "2026-11-02T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const id = created.data.booking.id;

    const fail = await simulatePayment(id, "failure");
    assert.equal(fail.ok, true);
    if (!fail.ok) return;
    assert.equal(fail.data.booking.status, "payment_failed");
    assert.equal(fail.data.attempt.status, "failed");

    const ok = await simulatePayment(id, "success");
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(ok.data.booking.status, "paid");
    assert.equal(ok.data.attempt.status, "succeeded");
    assert.equal(ok.data.attempt.mode, "simulated");
  });

  it("blocks payment of cancelled bookings and invalid transitions", async () => {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "Cancel Path",
      customerEmail: "cancel@example.com",
      scheduledFor: "2026-11-03T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const id = created.data.booking.id;

    const cancelled = await cancelRuntimeBooking(id);
    assert.equal(cancelled.ok, true);

    const pay = await simulatePayment(id, "success");
    assert.equal(pay.ok, false);

    const again = await cancelRuntimeBooking(id);
    assert.equal(again.ok, false);
  });

  it("blocks paying already-paid bookings and seed bookings", async () => {
    const created = await createBooking({
      listingId: "list_maths_intensive",
      customerName: "Paid Path",
      customerEmail: "paid@example.com",
      scheduledFor: "2026-11-04T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const id = created.data.booking.id;
    const paid = await simulatePayment(id, "success");
    assert.equal(paid.ok, true);
    const dup = await simulatePayment(id, "success");
    assert.equal(dup.ok, false);

    const seedPay = await simulatePayment("book_pending_demo", "success");
    assert.equal(seedPay.ok, false);
    const seedCancel = await cancelRuntimeBooking("book_illustrative_paid");
    assert.equal(seedCancel.ok, false);
  });

  it("keeps seed data unchanged and merges provider/admin views", async () => {
    const beforeSeed = structuredClone(seedBookings);
    const created = await createBooking({
      listingId: "list_portrait_halfday",
      customerName: "Merge View",
      customerEmail: "merge@example.com",
      scheduledFor: "2026-11-05T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const all = await listAllBookings();
    assert.ok(all.length >= seedBookings.length + 1);
    assert.deepEqual(seedBookings, beforeSeed);

    const seedStillThere = await getBookingById("book_pending_demo");
    assert.equal(seedStillThere?.dataSource, "seed");

    const providerRows = await listBookingsForProvider(
      created.data.booking.providerId,
    );
    assert.ok(providerRows.some((b) => b.id === created.data.booking.id));

    const attempts = await listAllPaymentAttempts();
    assert.ok(attempts.some((a) => a.dataSource === "seed"));
  });

  it("persists across independent calls and concurrent creates", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        createBooking({
          listingId: "list_deep_clean",
          customerName: `Concurrent ${i}`,
          customerEmail: `c${i}@example.com`,
          scheduledFor: `2026-12-0${(i % 8) + 1}T09:00`,
        }),
      ),
    );
    assert.equal(results.filter((r) => r.ok).length, 8);
    const runtime = (await listAllBookings()).filter(
      (b) => b.dataSource === "mock",
    );
    assert.equal(runtime.length, 8);
  });

  it("surfaces runtime read failures instead of returning seed-only data", async () => {
    const memory = createMemoryStore();
    setMarketplaceStoreForTests({
      ...memory,
      async listBookings() {
        throw new Error("postgres://should-not-reach-the-user");
      },
    });

    await assert.rejects(
      listAllBookings(),
      (error: unknown) =>
        error instanceof Error &&
        /temporarily unavailable/.test(error.message) &&
        !error.message.includes("postgres://"),
    );
  });

  it("requires explicit reset intent and an exact non-production database target", () => {
    const databaseUrl = "postgresql://demo:secret@localhost/marketplace_preview";
    const base = {
      databaseUrl,
      confirm: "YES",
      nonProduction: "YES",
      targetDatabase: "marketplace_preview",
    };
    assert.equal(demoResetSafetyError(base), undefined);
    assert.match(
      demoResetSafetyError({ ...base, targetDatabase: "marketplace_prod" }) ?? "",
      /exactly match/,
    );
    assert.match(
      demoResetSafetyError({ ...base, nonProduction: undefined }) ?? "",
      /NON_PRODUCTION/,
    );
    assert.match(
      demoResetSafetyError({ ...base, confirm: undefined }) ?? "",
      /DEMO_RESET_CONFIRM/,
    );
  });

  it("requires explicit non-production database identity for integration tests", () => {
    const url = "postgresql://demo:secret@localhost/marketplace_preview";
    assert.equal(
      databaseTestSafetyError(url, "YES", "marketplace_preview"),
      undefined,
    );
    assert.match(
      databaseTestSafetyError(url, undefined, "marketplace_preview") ?? "",
      /DATABASE_TEST_NON_PRODUCTION/,
    );
    assert.match(
      databaseTestSafetyError(url, "YES", "marketplace_prod") ?? "",
      /exactly match/,
    );
  });

  it("returns a safe error when the store is unconfigured", async () => {
    setMarketplaceStoreForTests(undefined);
    // No override and no DATABASE_URL → unconfigured store
    delete process.env.DATABASE_URL;
    const result = await createBooking({
      listingId: "list_portrait_halfday",
      customerName: "No Database",
      customerEmail: "nodb@example.com",
      scheduledFor: "2026-11-06T09:00",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /database|configured/i);
    assert.doesNotMatch(result.error, /password|ECONN|postgres:\/\//i);
  });
});
