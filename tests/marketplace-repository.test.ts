import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  bookings as seedBookings,
  listings as seedListings,
  paymentAttempts as seedPaymentAttempts,
} from "../src/data/seed";
import { calculatePlatformFee } from "../src/lib/fees";
import {
  bookingFromRow,
  paymentAttemptFromRow,
  type BookingRow,
  type PaymentAttemptRow,
} from "../src/lib/store/row-mappers";
import {
  assertBookingMoneyConsistency,
  assertPaymentAmountMatchesBooking,
  createMoney,
  createSellerListingPrice,
  isCurrency,
  MAX_MINOR_UNIT_AMOUNT,
  moneyFromLegacyNgnKobo,
  moneyToLegacyNgnKobo,
  parseMinorUnits,
} from "../src/lib/money";
import { sellerListingFromRow, type SellerListingRow } from "../src/lib/store/row-mappers";
import { createSellerListingFromForm, listSellerListingsForSession } from "../src/lib/seller-listing-service";
import type { Booking, PaymentAttemptRecord, SellerListing } from "../src/types/marketplace";
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

  it("retains the exact NGN minor-unit values for every seed listing", () => {
    assert.deepEqual(
      seedListings.map(({ id, price }) => ({
        id,
        amountMinor: price.amountMinor,
        currency: price.currency,
      })),
      [
        { id: "list_portrait_halfday", amountMinor: 7_500_000, currency: "NGN" },
        { id: "list_event_coverage", amountMinor: 18_000_000, currency: "NGN" },
        { id: "list_maths_intensive", amountMinor: 4_000_000, currency: "NGN" },
        { id: "list_event_planning", amountMinor: 25_000_000, currency: "NGN" },
        { id: "list_deep_clean", amountMinor: 3_500_000, currency: "NGN" },
        { id: "list_growth_sprint", amountMinor: 45_000_000, currency: "NGN" },
        { id: "list_yoga_private", amountMinor: 1_200_000, currency: "NGN" },
      ],
    );
  });

  it("retains exact NGN snapshots and modes for seed bookings and attempts", () => {
    assert.deepEqual(
      seedBookings.map((booking) => ({
        id: booking.id,
        amount: booking.amount,
        platformFee: booking.platformFee,
        providerShare: booking.providerShare,
        status: booking.status,
      })),
      [
        {
          id: "book_pending_demo",
          amount: { amountMinor: 7_500_000, currency: "NGN" },
          platformFee: { amountMinor: 750_000, currency: "NGN" },
          providerShare: { amountMinor: 6_750_000, currency: "NGN" },
          status: "pending_payment",
        },
        {
          id: "book_cancelled_demo",
          amount: { amountMinor: 3_500_000, currency: "NGN" },
          platformFee: { amountMinor: 350_000, currency: "NGN" },
          providerShare: { amountMinor: 3_150_000, currency: "NGN" },
          status: "cancelled",
        },
        {
          id: "book_illustrative_paid",
          amount: { amountMinor: 4_000_000, currency: "NGN" },
          platformFee: { amountMinor: 400_000, currency: "NGN" },
          providerShare: { amountMinor: 3_600_000, currency: "NGN" },
          status: "paid",
        },
      ],
    );
    assert.deepEqual(
      seedPaymentAttempts.map((attempt) => ({
        amount: attempt.amount,
        mode: attempt.mode,
        status: attempt.status,
      })),
      [
        {
          amount: { amountMinor: 7_500_000, currency: "NGN" },
          mode: "none",
          status: "not_started",
        },
        {
          amount: { amountMinor: 4_000_000, currency: "NGN" },
          mode: "simulated",
          status: "succeeded",
        },
      ],
    );
  });

  it("uses floor-to-kobo fee rounding and conserves the booking amount", () => {
    for (const [amountKobo, expectedFeeKobo] of [
      [9, 0],
      [10, 1],
      [19, 1],
      [20, 2],
      [29, 2],
    ] as const) {
      const split = calculatePlatformFee(amountKobo, "NGN");
      assert.equal(split.platformFeeBps, 1_000);
      assert.equal(split.platformFee.amountMinor, expectedFeeKobo);
      assert.equal(
        split.platformFee.amountMinor + split.providerShare.amountMinor,
        split.amount.amountMinor,
      );
    }
  });

  it("validates supported currencies and calculates exact NGN and USD fees", () => {
    assert.equal(isCurrency("NGN"), true);
    assert.equal(isCurrency("USD"), true);
    assert.equal(isCurrency("EUR"), false);
    assert.deepEqual(createSellerListingPrice(1_234), {
      amountMinor: 1_234,
      currency: "USD",
    });
    assert.deepEqual(calculatePlatformFee(10_001, "USD"), {
      amount: { amountMinor: 10_001, currency: "USD" },
      platformFee: { amountMinor: 1_000, currency: "USD" },
      providerShare: { amountMinor: 9_001, currency: "USD" },
      platformFeeBps: 1_000,
      platformFeePercent: 10,
    });
    const ngn = calculatePlatformFee(10_001, "NGN");
    assert.equal(ngn.platformFee.amountMinor, 1_000);
    assert.equal(ngn.platformFee.currency, "NGN");

    const largeAmount = MAX_MINOR_UNIT_AMOUNT;
    const exactFee =
      (BigInt(largeAmount) * BigInt(1_000)) / BigInt(10_000);
    const largeSplit = calculatePlatformFee(largeAmount, "USD");
    assert.equal(largeSplit.platformFee.amountMinor, Number(exactFee));
    assert.equal(
      largeSplit.platformFee.amountMinor + largeSplit.providerShare.amountMinor,
      largeAmount,
    );
  });

  it("rejects invalid amounts and basis-point configurations", () => {
    for (const amount of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      MAX_MINOR_UNIT_AMOUNT + 1,
    ]) {
      assert.throws(() => calculatePlatformFee(amount, "USD"));
    }
    assert.throws(() => calculatePlatformFee(100, "EUR" as never));
    for (const basisPoints of [-1, 10_001, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => calculatePlatformFee(100, "NGN", basisPoints));
    }
    assert.throws(() => createMoney(100, "EUR" as never));
  });

  it("rejects booking and attempt currency or amount mismatches", () => {
    const amount = createMoney(100, "USD");
    const fee = createMoney(10, "USD");
    const share = createMoney(90, "USD");
    assert.doesNotThrow(() => assertBookingMoneyConsistency(amount, fee, share));
    assert.throws(() =>
      assertBookingMoneyConsistency(
        amount,
        createMoney(10, "NGN"),
        share,
      ),
    );
    assert.throws(() =>
      assertBookingMoneyConsistency(amount, fee, createMoney(89, "USD")),
    );
    assert.doesNotThrow(() => assertPaymentAmountMatchesBooking(amount, amount));
    assert.throws(() =>
      assertPaymentAmountMatchesBooking(createMoney(99, "USD"), amount),
    );
    assert.throws(() =>
      assertPaymentAmountMatchesBooking(createMoney(100, "NGN"), amount),
    );
  });

  it("rejects a mismatched payment attempt before changing memory-store state", async () => {
    const booking: Booking = {
      ...seedBookings[0],
      amount: { amountMinor: 1_000, currency: "USD" },
      platformFee: { amountMinor: 100, currency: "USD" },
      providerShare: { amountMinor: 900, currency: "USD" },
    };
    const store = createMemoryStore({ bookings: [booking] });
    const attempt: PaymentAttemptRecord = {
      ...seedPaymentAttempts[0],
      id: "pay_mismatch",
      bookingId: booking.id,
      amount: { amountMinor: 1_000, currency: "NGN" },
    };
    await assert.rejects(
      store.updateBooking(booking.id, (current) => ({ booking: { ...current, status: "paid" }, attempt })),
      /same currency/,
    );
    assert.equal((await store.getBookingById(booking.id))?.status, booking.status);
    assert.deepEqual(await store.listPaymentAttempts(), []);
  });

  it("keeps the legacy Postgres boundary explicitly NGN/kobo only", () => {
    assert.deepEqual(moneyFromLegacyNgnKobo(12_345, "NGN"), {
      amountMinor: 12_345,
      currency: "NGN",
    });
    assert.equal(moneyToLegacyNgnKobo(createMoney(12_345, "NGN")), 12_345);
    assert.throws(() => moneyFromLegacyNgnKobo(12_345, "USD"));
    assert.throws(() => moneyToLegacyNgnKobo(createMoney(12_345, "USD")));
  });

  it("maps canonical currency-aware rows and safely parses BIGINT values", () => {
    const bookingRow: BookingRow = {
      id: "book_db_fixture",
      listing_id: "list_deep_clean",
      seller_listing_id: null,
      provider_id: "prov_tunde",
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      scheduled_for: "2026-11-01T10:00:00.000Z",
      amount_minor: "10000",
      currency: "USD",
      platform_fee_minor: BigInt(1000),
      provider_share_minor: 9_000,
      status: "pending_payment",
      payment_mode: "simulated",
      payment_attempt_status: "not_started",
      data_source: "mock",
      created_at: "2026-10-01T10:00:00.000Z",
      status_note: "fixture",
    };
    const attemptRow: PaymentAttemptRow = {
      id: "pay_db_fixture",
      booking_id: bookingRow.id,
      provider: "mock",
      mode: "simulated",
      status: "succeeded",
      amount_minor: "10000",
      currency: "USD",
      data_source: "mock",
      note: "fixture",
      created_at: "2026-10-01T10:01:00.000Z",
    };

    assert.deepEqual(bookingFromRow(bookingRow).amount, {
      amountMinor: 10_000,
      currency: "USD",
    });
    assert.deepEqual(paymentAttemptFromRow(attemptRow).amount, {
      amountMinor: 10_000,
      currency: "USD",
    });
    const historicalNgn = bookingFromRow({
      ...bookingRow,
      amount_minor: "10000",
      platform_fee_minor: "1000",
      provider_share_minor: "9000",
      currency: "NGN",
    });
    assert.deepEqual(historicalNgn.amount, { amountMinor: 10_000, currency: "NGN" });
    assert.deepEqual(historicalNgn.platformFee, { amountMinor: 1_000, currency: "NGN" });
    assert.deepEqual(historicalNgn.providerShare, { amountMinor: 9_000, currency: "NGN" });
    assert.throws(() => bookingFromRow({ ...bookingRow, currency: "EUR" }));
    assert.throws(() => paymentAttemptFromRow({ ...attemptRow, currency: "EUR" }));

    assert.equal(parseMinorUnits("9007199254740991"), Number.MAX_SAFE_INTEGER);
    for (const invalid of ["9007199254740992", "01", "-1", "1.2", "not-a-number", Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => parseMinorUnits(invalid));
    }
  });

  it("maps seller listing prices only as safe USD cents", () => {
    const row: SellerListingRow = {
      id: "seller_listing_1",
      seller_profile_id: "seller_1",
      title: "Consulting session",
      description: "A practical consulting session.",
      price_minor: "2500",
      currency: "USD",
      duration_minutes: 60,
      availability_note: "Weekdays",
      status: "draft",
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    };
    assert.deepEqual(sellerListingFromRow(row).price, { amountMinor: 2500, currency: "USD" });
    assert.throws(() => sellerListingFromRow({ ...row, currency: "NGN" }));
    assert.throws(() => sellerListingFromRow({ ...row, price_minor: "9007199254740992" }));
  });

  it("declares historical preservation and currency integrity in migration 004", () => {
    const sql = readFileSync("db/migrations/004_currency_aware_marketplace.sql", "utf8");
    const disposableSql = readFileSync("tests/migration-004-disposable.sql", "utf8");
    const postgresAdapter = readFileSync("src/lib/store/postgres-adapter.ts", "utf8");
    const migrationRunner = readFileSync("scripts/db-migrate.ts", "utf8");
    assert.match(sql, /amount_minor\s*=\s*COALESCE\(amount_minor, amount_kobo::BIGINT\)/i);
    assert.match(sql, /currency IN \('NGN', 'USD'\)/i);
    assert.match(sql, /FOREIGN KEY \(booking_id, currency, amount_minor\)/i);
    assert.match(sql, /REFERENCES runtime_bookings \(id, currency, amount_minor\)/i);
    assert.match(sql, /seller_profile_id TEXT NOT NULL[\s\S]+REFERENCES seller_profiles/i);
    assert.match(sql, /currency TEXT NOT NULL CHECK \(currency = 'USD'\)/i);
    assert.match(sql, /seller_listing_id TEXT[\s\S]+REFERENCES seller_listings/i);
    assert.match(sql, /CREATE TRIGGER runtime_bookings_sync_money/i);
    assert.match(sql, /CREATE TRIGGER runtime_payment_attempts_sync_money/i);
    assert.match(sql, /9007199254740991/);
    assert.match(sql, /runtime_bookings_amount_minor_chk[\s\S]+BETWEEN 0 AND 9007199254740991/i);
    assert.match(sql, /runtime_bookings_platform_fee_minor_chk[\s\S]+BETWEEN 0 AND 9007199254740991/i);
    assert.match(sql, /runtime_bookings_provider_share_minor_chk[\s\S]+BETWEEN 0 AND 9007199254740991/i);
    assert.match(sql, /runtime_payment_attempts_amount_minor_chk[\s\S]+BETWEEN 0 AND 9007199254740991/i);
    assert.match(sql, /price_minor BIGINT NOT NULL[\s\S]+BETWEEN 1 AND 9007199254740991/i);
    assert.match(sql, /unsafe or conflicting canonical money/i);
    assert.match(sql, /runtime_payment_attempts contains rows that do not match their booking amount and currency/i);
    assert.match(sql, /COALESCE\(amount_minor, amount_kobo::BIGINT\)/i);
    assert.match(sql, /canonical and legacy money values conflict/i);
    assert.match(sql, /canonical and legacy amount conflict/i);
    assert.match(sql, /marketplace\.currency_aware_money_write/i);
    assert.match(postgresAdapter, /set_config\('marketplace\.currency_aware_money_write', 'true', true\)/);
    assert.match(postgresAdapter, /async insertBooking\(booking\)[\s\S]+withTransaction\(pool/);
    assert.match(migrationRunner, /\.sort\(\)/);
    assert.match(migrationRunner, /for \(const file of files\)/);
    assert.match(disposableSql, /legacy-only insert and update/i);
    assert.match(disposableSql, /matching dual writes pass/i);
    assert.match(disposableSql, /canonical and legacy money values conflict/i);
    assert.match(disposableSql, /currency = 'USD'/i);
    assert.match(disposableSql, /bad_amount/i);
    assert.match(disposableSql, /Number\.MAX_SAFE_INTEGER/);
  });

  it("creates USD draft listings under the verified session owner only", async () => {
    const store = createMemoryStore({
      sellerProfiles: [
        { id: "seller_1", clerkUserId: "user_1", displayName: "Seller One", createdAt: "2026-10-01T10:00:00.000Z" },
        { id: "seller_2", clerkUserId: "user_2", displayName: "Seller Two", createdAt: "2026-10-01T10:00:00.000Z" },
      ],
    });
    const form = new FormData();
    form.set("title", "Consulting session");
    form.set("description", "A practical consulting session.");
    form.set("priceUsdCents", "2500");
    form.set("durationMinutes", "60");
    form.set("availabilityNote", "Weekdays");
    form.set("sellerProfileId", "seller_2");
    form.set("currency", "NGN");
    const input = {
      formData: form,
      clerkConfigured: true,
      readSession: async () => ({ userId: "user_1", isAuthenticated: true }),
      store,
    };
    const created = await createSellerListingFromForm(input);
    assert.equal(created.sellerProfileId, "seller_1");
    assert.deepEqual(created.price, { amountMinor: 2500, currency: "USD" });
    assert.equal(created.status, "draft");
    assert.deepEqual(await listSellerListingsForSession({
      clerkConfigured: true,
      readSession: input.readSession,
      store,
    }), [created]);
    assert.deepEqual(await store.listSellerListingsForClerkUserId("user_2"), []);

    form.set("priceUsdCents", "1.25");
    await assert.rejects(createSellerListingFromForm(input), /USD cents/);
  });

  it("creates a valid booking with server-side fees", async () => {
    const listingId = "list_portrait_halfday";
    const expected = calculatePlatformFee(7_500_000, "NGN");
    const result = await createBooking({
      listingId,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      scheduledFor: "2026-11-01T10:00",
      // Extra browser fields are deliberately forged; the domain input does
      // not accept them, and booking creation must price from the listing.
      amount: { amountMinor: 1, currency: "USD" },
      currency: "USD",
    } as never);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.booking.status, "pending_payment");
    assert.equal(result.data.booking.paymentMode, "simulated");
    assert.equal(result.data.booking.dataSource, "mock");
    assert.deepEqual(result.data.booking.amount, expected.amount);
    assert.equal(result.data.booking.amount.amountMinor, 7_500_000);
    assert.equal(result.data.booking.amount.currency, "NGN");
    assert.deepEqual(result.data.booking.platformFee, expected.platformFee);
    assert.equal(result.data.booking.platformFee.amountMinor, 750_000);
    assert.equal(
      result.data.booking.providerShare.amountMinor,
      expected.providerShare.amountMinor,
    );
    assert.equal(result.data.booking.providerShare.amountMinor, 6_750_000);
    assert.equal(
      result.data.booking.platformFee.amountMinor +
        result.data.booking.providerShare.amountMinor,
      result.data.booking.amount.amountMinor,
    );
  });

  it("prices published seller bookings from stored USD cents and snapshots simulated attempts", async () => {
    const sellerListing: SellerListing = {
      id: "seller_listing_published",
      sellerProfileId: "seller_profile_real",
      title: "Consulting session",
      description: "A practical consulting session.",
      price: { amountMinor: 2_599, currency: "USD" },
      durationMinutes: 60,
      availabilityNote: "Weekdays",
      status: "published",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    setMarketplaceStoreForTests(createMemoryStore({ sellerListings: [sellerListing] }));
    const created = await createBooking({
      listingId: sellerListing.id,
      customerName: "Customer",
      customerEmail: "customer@example.com",
      scheduledFor: "2026-11-10T12:00:00Z",
      amount: { amountMinor: 1, currency: "NGN" },
    } as never);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.data.booking.sellerListingId, sellerListing.id);
    assert.equal(created.data.booking.providerId, sellerListing.sellerProfileId);
    assert.deepEqual(created.data.booking.amount, { amountMinor: 2_599, currency: "USD" });
    assert.deepEqual(created.data.booking.platformFee, { amountMinor: 259, currency: "USD" });
    assert.deepEqual(created.data.booking.providerShare, { amountMinor: 2_340, currency: "USD" });

    const payment = await simulatePayment(created.data.booking.id, "success");
    assert.equal(payment.ok, true);
    if (!payment.ok) return;
    assert.deepEqual(payment.data.attempt.amount, { amountMinor: 2_599, currency: "USD" });
    assert.equal(payment.data.attempt.mode, "simulated");
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
    assert.equal(ok.data.attempt.provider, "mock");
    assert.equal(ok.data.attempt.dataSource, "mock");
    assert.equal(ok.data.attempt.status, "succeeded");
    assert.deepEqual(ok.data.attempt.amount, ok.data.booking.amount);
    assert.equal(ok.data.attempt.amount.amountMinor, 3_500_000);
    assert.equal(ok.data.attempt.amount.currency, "NGN");
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
